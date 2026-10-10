package com.lanmessenger.apk;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Small loopback reverse proxy. WebView sees http://127.0.0.1:<port> (a
 * potentially trustworthy loopback origin), while traffic is forwarded to
 * the user's LAN HTTP server. It supports normal HTTP requests and WebSocket
 * upgrade/tunnelling so typical messenger traffic keeps working.
 */
public final class LanReverseProxy {
    private ServerSocket serverSocket;
    private volatile String targetHost = "192.168.1.9";
    private volatile int targetPort = 8080;
    private Thread acceptThread;
    private volatile boolean running;

    public synchronized int start() throws IOException {
        if (running) return serverSocket.getLocalPort();
        serverSocket = new ServerSocket();
        serverSocket.setReuseAddress(true);
        // Bind explicitly to IPv4 loopback because the WebView connects to 127.0.0.1.
        // InetAddress.getLoopbackAddress() may select ::1 on some Android devices,
        // which would make an IPv4 127.0.0.1 connection fail with ECONNREFUSED.
        serverSocket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0));
        running = true;
        acceptThread = new Thread(() -> {
            while (running) {
                try {
                    final Socket client = serverSocket.accept();
                    client.setTcpNoDelay(true);
                    new Thread(() -> handle(client), "lan-proxy-client").start();
                } catch (IOException ignored) {
                    if (running) { /* continue until stopped */ }
                }
            }
        }, "lan-proxy-accept");
        acceptThread.start();
        return serverSocket.getLocalPort();
    }

    public synchronized boolean isRunning() {
        return running && serverSocket != null && !serverSocket.isClosed();
    }

    public void setTarget(String host, int port) {
        if (host == null || host.trim().isEmpty()) throw new IllegalArgumentException("host");
        if (port < 1 || port > 65535) throw new IllegalArgumentException("port");
        targetHost = host.trim();
        targetPort = port;
    }

    public String getTargetHost() { return targetHost; }
    public int getTargetPort() { return targetPort; }

    public synchronized void stop() {
        running = false;
        if (serverSocket != null) {
            try { serverSocket.close(); } catch (IOException ignored) {}
            serverSocket = null;
        }
    }

    private void handle(Socket client) {
        try (Socket c = client) {
            c.setSoTimeout(30000);
            InputStream cin = new BufferedInputStream(c.getInputStream());
            OutputStream cout = new BufferedOutputStream(c.getOutputStream());

            byte[] headerBytes = readHeaders(cin, 1024 * 1024);
            if (headerBytes == null) return;
            String headerText = new String(headerBytes, StandardCharsets.ISO_8859_1);
            int split = headerText.indexOf("\r\n\r\n");
            if (split < 0) return;

            String[] lines = headerText.substring(0, split).split("\r\n");
            String requestLine = lines[0];
            String[] parts = requestLine.split(" ", 3);
            if (parts.length < 2) return;
            String method = parts[0];
            String path = parts[1];
            boolean websocket = hasHeader(lines, "Upgrade", "websocket");

            String host = targetHost;
            int port = targetPort;
            Socket upstream = new Socket();
            upstream.setTcpNoDelay(true);
            upstream.connect(new InetSocketAddress(host, port), 10000);
            upstream.setSoTimeout(30000);

            try (Socket up = upstream) {
                InputStream uin = new BufferedInputStream(up.getInputStream());
                OutputStream uout = new BufferedOutputStream(up.getOutputStream());

                StringBuilder outHeaders = new StringBuilder();
                outHeaders.append(method).append(' ').append(path).append(" HTTP/1.1\r\n");
                for (int i = 1; i < lines.length; i++) {
                    String line = lines[i];
                    int colon = line.indexOf(':');
                    if (colon <= 0) continue;
                    String name = line.substring(0, colon).trim();
                    String value = line.substring(colon + 1).trim();
                    if (name.equalsIgnoreCase("Host")) {
                        outHeaders.append("Host: ").append(host).append(':').append(port).append("\r\n");
                    } else if (name.equalsIgnoreCase("Connection") && websocket) {
                        outHeaders.append("Connection: Upgrade\r\n");
                    } else if (name.equalsIgnoreCase("Origin") && websocket) {
                        outHeaders.append("Origin: http://").append(host).append(':').append(port).append("\r\n");
                    } else if (name.equalsIgnoreCase("Content-Length") || name.equalsIgnoreCase("Transfer-Encoding")
                            || name.equalsIgnoreCase("Content-Type") || name.equalsIgnoreCase("Cookie")
                            || name.equalsIgnoreCase("Authorization") || name.equalsIgnoreCase("Accept")
                            || name.equalsIgnoreCase("Accept-Encoding") || name.equalsIgnoreCase("User-Agent")
                            || name.equalsIgnoreCase("Sec-WebSocket-Key") || name.equalsIgnoreCase("Sec-WebSocket-Version")
                            || name.equalsIgnoreCase("Sec-WebSocket-Protocol") || name.equalsIgnoreCase("Sec-WebSocket-Extensions")
                            || name.equalsIgnoreCase("Upgrade") || name.equalsIgnoreCase("Referer")
                            || name.equalsIgnoreCase("Range") || name.equalsIgnoreCase("If-None-Match")
                            || name.equalsIgnoreCase("If-Modified-Since") || name.equalsIgnoreCase("X-Requested-With")) {
                        outHeaders.append(name).append(": ").append(value).append("\r\n");
                    } else {
                        // Preserve ordinary headers; drop hop-by-hop headers that can confuse the proxy.
                        if (!isHopByHop(name)) outHeaders.append(name).append(": ").append(value).append("\r\n");
                    }
                }
                outHeaders.append("Connection: ").append(websocket ? "Upgrade" : "close").append("\r\n");
                outHeaders.append("\r\n");
                uout.write(outHeaders.toString().getBytes(StandardCharsets.ISO_8859_1));

                int bodyStart = split + 4;
                int initialBody = headerBytes.length - bodyStart;
                if (initialBody > 0) uout.write(headerBytes, bodyStart, initialBody);
                forwardRequestBody(cin, uout, lines);
                uout.flush();

                if (websocket) {
                    // Tunnel after the 101 handshake. We intentionally relay the handshake
                    // response first so WebView can switch to WebSocket mode.
                    byte[] responseHeaders = readHeaders(uin, 1024 * 1024);
                    if (responseHeaders == null) return;
                    cout.write(rewriteResponseHeaders(responseHeaders));
                    cout.flush();
                    tunnel(c, up, cin, cout, uin, uout);
                    return;
                }

                relayHttpResponse(uin, cout);
                cout.flush();
            }
        } catch (Exception ignored) {
            // Network failure is surfaced to WebView as a failed request.
        }
    }

    private void forwardRequestBody(InputStream in, OutputStream out, String[] lines) throws IOException {
        long len = headerLong(lines, "Content-Length", -1);
        if (len >= 0) {
            copyExactly(in, out, len);
            return;
        }
        if (hasHeaderName(lines, "Transfer-Encoding")) {
            // Forward chunked request exactly as received until the terminating chunk.
            while (true) {
                String line = readLine(in);
                if (line == null) return;
                out.write(line.getBytes(StandardCharsets.ISO_8859_1)); out.write("\r\n".getBytes(StandardCharsets.ISO_8859_1));
                String sizePart = line.trim();
                int semi = sizePart.indexOf(';');
                if (semi >= 0) sizePart = sizePart.substring(0, semi);
                long n;
                try { n = Long.parseLong(sizePart.trim(), 16); } catch (Exception e) { return; }
                if (n > 0) { copyExactly(in, out, n); copyExactly(in, out, 2); }
                else {
                    // trailers + final CRLF
                    while (true) { String t = readLine(in); if (t == null || t.isEmpty()) break; out.write(t.getBytes(StandardCharsets.ISO_8859_1)); out.write("\r\n".getBytes(StandardCharsets.ISO_8859_1)); }
                    out.write("\r\n".getBytes(StandardCharsets.ISO_8859_1));
                    return;
                }
            }
        }
    }

    private void relayHttpResponse(InputStream in, OutputStream out) throws IOException {
        byte[] headers = readHeaders(in, 1024 * 1024);
        if (headers == null) return;
        out.write(rewriteResponseHeaders(headers));
        String h = new String(headers, StandardCharsets.ISO_8859_1);
        int split = h.indexOf("\r\n\r\n");
        String head = split >= 0 ? h.substring(0, split) : h;
        int status = 200;
        String[] lines = head.split("\r\n");
        if (lines.length > 0) {
            String[] p = lines[0].split(" ", 3);
            if (p.length > 1) try { status = Integer.parseInt(p[1]); } catch (Exception ignored) {}
        }
        long len = headerLong(lines, "Content-Length", -1);
        boolean chunked = headerValue(lines, "Transfer-Encoding").toLowerCase(Locale.US).contains("chunked");
        boolean noBody = (status >= 100 && status < 200) || status == 204 || status == 304;
        if (noBody) return;
        if (len >= 0) { copyExactly(in, out, len); }
        else if (chunked) { copyChunked(in, out); }
        else { copyUntilClose(in, out); }
    }

    private byte[] rewriteResponseHeaders(byte[] headers) {
        String h = new String(headers, StandardCharsets.ISO_8859_1);
        StringBuilder out = new StringBuilder();
        String[] lines = h.split("\r\n", -1);
        String remoteBase = "http://" + targetHost + ":" + targetPort;
        String localBase = "http://127.0.0.1:" + serverSocket.getLocalPort();
        for (String line : lines) {
            if (line.regionMatches(true, 0, "Location:", 0, 9)) {
                int c = line.indexOf(':');
                String v = line.substring(c + 1).trim();
                if (v.startsWith(remoteBase)) v = localBase + v.substring(remoteBase.length());
                else if (v.startsWith("http://" + targetHost + ":")) v = localBase + v.substring(v.indexOf('/', 7 + targetHost.length() + 1));
                out.append("Location: ").append(v).append("\r\n");
            } else if (line.regionMatches(true, 0, "Set-Cookie:", 0, 11)) {
                // Host-only cookies should belong to the loopback origin. Drop a Domain attribute
                // that points at the LAN IP; otherwise Chromium may reject the cookie on localhost.
                String v = line.substring(line.indexOf(':') + 1).trim();
                v = v.replaceAll("(?i);\\s*Domain=" + java.util.regex.Pattern.quote(targetHost), "");
                out.append("Set-Cookie: ").append(v).append("\r\n");
            } else if (line.regionMatches(true, 0, "Connection:", 0, 11)) {
                out.append("Connection: close\r\n");
            } else {
                out.append(line).append("\r\n");
            }
        }
        return out.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    private void tunnel(Socket client, Socket upstream, InputStream cin, OutputStream cout, InputStream uin, OutputStream uout) throws IOException {
        client.setSoTimeout(0); upstream.setSoTimeout(0);
        Thread a = new Thread(() -> pipe(cin, uout), "lan-ws-c2s");
        Thread b = new Thread(() -> pipe(uin, cout), "lan-ws-s2c");
        a.start(); b.start();
        try { a.join(); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
        try { b.join(1000); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    private void pipe(InputStream in, OutputStream out) {
        byte[] buf = new byte[8192];
        try { int n; while ((n = in.read(buf)) != -1) { out.write(buf, 0, n); out.flush(); } } catch (IOException ignored) {}
    }

    private boolean isHopByHop(String name) {
        return name.equalsIgnoreCase("Connection") || name.equalsIgnoreCase("Keep-Alive")
                || name.equalsIgnoreCase("Proxy-Authenticate") || name.equalsIgnoreCase("Proxy-Authorization")
                || name.equalsIgnoreCase("TE") || name.equalsIgnoreCase("Trailer") || name.equalsIgnoreCase("Transfer-Encoding")
                || name.equalsIgnoreCase("Upgrade");
    }

    private boolean hasHeader(String[] lines, String name, String expected) {
        String v = headerValue(lines, name);
        return v.toLowerCase(Locale.US).contains(expected.toLowerCase(Locale.US));
    }
    private boolean hasHeaderName(String[] lines, String name) { return !headerValue(lines, name).isEmpty(); }
    private String headerValue(String[] lines, String name) {
        for (String l : lines) { int c=l.indexOf(':'); if(c>0 && l.substring(0,c).trim().equalsIgnoreCase(name)) return l.substring(c+1).trim(); }
        return "";
    }
    private long headerLong(String[] lines, String name, long def) { try { String v=headerValue(lines,name); return v.isEmpty()?def:Long.parseLong(v.trim()); } catch(Exception e){return def;} }

    private byte[] readHeaders(InputStream in, int max) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int state=0; int x;
        while (b.size() < max && (x=in.read()) != -1) {
            b.write(x);
            if (state==0 && x=='\r') state=1;
            else if (state==1 && x=='\n') state=2;
            else if (state==2 && x=='\r') state=3;
            else if (state==3 && x=='\n') return b.toByteArray();
            else state=0;
        }
        return null;
    }
    private String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream b=new ByteArrayOutputStream(); int prev=-1,x;
        while((x=in.read())!=-1){ if(prev=='\r'&&x=='\n'){b.write('\r'); b.write('\n'); return new String(b.toByteArray(),StandardCharsets.ISO_8859_1);} b.write(x); prev=x; }
        return null;
    }
    private void copyExactly(InputStream in, OutputStream out, long n) throws IOException { byte[] b=new byte[8192]; while(n>0){int r=in.read(b,0,(int)Math.min(b.length,n)); if(r<0) throw new EOFException(); out.write(b,0,r); n-=r;} }
    private void copyChunked(InputStream in, OutputStream out) throws IOException { while(true){String line=readLine(in); if(line==null)return; out.write(line.getBytes(StandardCharsets.ISO_8859_1)); String s=line.trim(); int semi=s.indexOf(';'); if(semi>=0)s=s.substring(0,semi); long n=Long.parseLong(s,16); if(n>0){copyExactly(in,out,n);copyExactly(in,out,2);}else{while(true){String t=readLine(in);if(t==null||t.isEmpty())break;out.write(t.getBytes(StandardCharsets.ISO_8859_1));}out.write("\r\n".getBytes(StandardCharsets.ISO_8859_1));return;}} }
    private void copyUntilClose(InputStream in, OutputStream out) throws IOException { byte[] b=new byte[8192]; int n; while((n=in.read(b))!=-1)out.write(b,0,n); }
}
