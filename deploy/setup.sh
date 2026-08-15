#!/bin/bash
set -e

echo "=== no-name relay setup ==="

# --- Systemd service ---
SERVICE_FILE="/etc/systemd/system/no-name-relay.service"
cat > "$SERVICE_FILE" << 'SERVICEEOF'
[Unit]
Description=no-name relay server
After=network.target

[Service]
Type=simple
User=riley
Group=riley
WorkingDirectory=/home/riley/no-name/apps/relay
ExecStart=/usr/bin/node --import tsx src/index.ts
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=DATA_DIR=/home/riley/no-name/apps/relay/data
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo "Installed systemd service"
systemctl daemon-reload
systemctl enable --now no-name-relay
echo "  Relay started"

sleep 2
if curl -s http://127.0.0.1:3000/api/stats > /dev/null 2>&1; then
    echo "  Relay verified responding on :3000"
else
    echo "  WARNING: relay health check failed, check journalctl -u no-name-relay"
fi

echo ""
echo "Relay listening on:"
echo "  http://127.0.0.1:3000"
echo ""
echo "=== Setup complete ==="
