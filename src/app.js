import http from 'http';
import os from 'os'
import fs from 'fs'

function getContainerID() {
  try {
    const cgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
    const lines = cgroup.split('\n');
    for (let line of lines) {
      const parts = line.split(':');
      if (parts.length === 3 && parts[2].includes('docker')) {
        return parts[2].split('/').pop().trim();
      }
      if (parts.length === 3 && parts[2].includes('kubepods')) {
        // For containerd/K8s
        const id = parts[2].split('/').pop().trim();
        if (id) return id;
      }
    }
  } catch (err) {
    return 'N/A';
  }
  return 'N/A';
}

const containerID = getContainerID();

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  let k = 1024;
  let sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function systemInfoHTML() {
  const cpus = os.cpus().map(cpu => cpu.model).join('<br>');
  const netIfs = Object.entries(os.networkInterfaces())
    .map(([name, addrs]) => `<b>${name}</b>: ${addrs.map(a => a.address).join(', ')}`)
    .join('<br>');

  const podInfo = {
    Pod: process.env.POD_NAME || 'N/A',
    Namespace: process.env.POD_NAMESPACE || 'N/A',
    Node: process.env.NODE_NAME || 'N/A',
    HostIP: process.env.HOST_IP || 'N/A',
    ContainerID: getContainerID()
  };

  const rows = [
    ['Hostname', os.hostname()],
    ['OS Type', os.type()],
    ['Platform', os.platform()],
    ['Arch', os.arch()],
    ['CPU(s)', cpus],
    ['Total Memory', formatBytes(os.totalmem())],
    ['Free Memory', formatBytes(os.freemem())],
    ['Uptime', `${(os.uptime()/3600).toFixed(2)} hours`],
    ['Node.js Version', process.version],
    ['Network Interfaces', netIfs],
    ['Pod Name', podInfo.Pod],
    ['Namespace', podInfo.Namespace],
    ['Node Name', podInfo.Node],
    ['Host IP', podInfo.HostIP],
    ['Container ID', podInfo.ContainerID]
  ];

  let table = '<table border="1" cellpadding="5" cellspacing="0">';
  table += '<tr><th>Key</th><th>Value</th></tr>';
  rows.forEach(([key, val]) => {
    table += `<tr><td>${key}</td><td>${val}</td></tr>`;
  });
  table += '</table>';
  return table;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'OK', uptime: os.uptime()}));
  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
      <html>
        <head>
          <title>Node OS Info</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { border-collapse: collapse; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Node.js OS Information</h1>
          ${systemInfoHTML()}
        </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Node OS info server running on port ${PORT}`);
});