const delay = process.argv[2] || 1000;
setTimeout(() => {
  process.exit(0);
}, parseInt(delay));