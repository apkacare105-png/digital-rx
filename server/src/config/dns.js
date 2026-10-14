// Loads .env and (optionally) forces custom DNS servers BEFORE anything connects to MongoDB.
// Fixes the "querySrv ECONNREFUSED / ETIMEOUT" error that some ISPs (e.g. Jio) cause with
// mongodb+srv:// (Atlas) URIs. Controlled by DNS_SERVERS in .env; leave empty to use system DNS.
// Only affects SRV/TXT lookups (what Atlas needs); normal hostname/IP connections are unaffected.
require('dotenv').config();
const dns = require('dns');

const servers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (servers.length) {
  try {
    dns.setServers(servers);
    console.log(`DNS servers set to: ${servers.join(', ')}`);
  } catch (e) {
    console.warn(`Invalid DNS_SERVERS (${process.env.DNS_SERVERS}): ${e.message}`);
  }
}

module.exports = servers;
