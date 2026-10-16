import express from 'express';
import os from 'os';

const router = express.Router();

router.get('/interfaces', (req, res) => {
  const interfaces = os.networkInterfaces();
  const lanAddresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ('IPv4' === iface.family && !iface.internal) {
        lanAddresses.push({
          interface: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac
        });
      }
    }
  }

  res.json({
    hostname: os.hostname(),
    port: process.env.PORT || 3000,
    addresses: lanAddresses
  });
});

export default router;
