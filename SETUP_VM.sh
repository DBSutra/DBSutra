#!/bin/bash
# DBSutra VM Setup Script
# Run on: ssh root@45.79.124.28

set -e

echo "=== DBSutra VM Setup ==="

# System packages
apt-get update -qq
apt-get install -y -qq docker.io docker-compose git curl jq nginx certbot python3-certbot-nginx

# Docker setup
systemctl enable docker
systemctl start docker

# Create project structure
mkdir -p /opt/dbsutra/{data,logs,backups,nginx}

# Create docker-compose for test databases
cat > /opt/dbsutra/docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dbsutra
      POSTGRES_PASSWORD: ${PG_PASSWORD:-DBSutra_Test_2024}
      POSTGRES_DB: testdb
    ports:
      - '127.0.0.1:5432:5432'
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  mysql:
    image: mysql:9.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-DBSutra_Root_2024}
      MYSQL_USER: dbsutra
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-DBSutra_Test_2024}
      MYSQL_DATABASE: testdb
    ports:
      - '127.0.0.1:3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine --requirepass ${REDIS_PASSWORD:-DBSutra_Redis_2024}
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - redis_data:/data
    restart: unless-stopped

  mongodb:
    image: mongo:8.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: dbsutra
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-DBSutra_Mongo_2024}
    ports:
      - '127.0.0.1:27017:27017'
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  elasticsearch:
    image: elasticsearch:8.15.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - '127.0.0.1:9200:9200'
    volumes:
      - es_data:/usr/share/elasticsearch/data
    restart: unless-stopped

volumes:
  pg_data:
  mysql_data:
  redis_data:
  mongo_data:
  es_data:
EOF

# Create .env file with secure passwords
cat > /opt/dbsutra/.env << 'EOF'
PG_PASSWORD=DBSutra_Test_2024
MYSQL_ROOT_PASSWORD=DBSutra_Root_2024
MYSQL_PASSWORD=DBSutra_Test_2024
REDIS_PASSWORD=DBSutra_Redis_2024
MONGO_PASSWORD=DBSutra_Mongo_2024
EOF
chmod 600 /opt/dbsutra/.env

# Start services
cd /opt/dbsutra && docker compose up -d

# Create backup script
cat > /opt/dbsutra/backup.sh << 'BACKUP'
#!/bin/bash
BACKUP_DIR="/opt/dbsutra/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cd /opt/dbsutra
docker compose exec -T postgres pg_dump -U dbsutra testdb > "$BACKUP_DIR/postgres.sql"
docker compose exec -T mysql mysqldump -u dbsutra -pDBSutra_Test_2024 testdb > "$BACKUP_DIR/mysql.sql"
echo "Backup completed: $BACKUP_DIR"
BACKUP
chmod +x /opt/dbsutra/backup.sh

# Create systemd service for auto-backup
cat > /etc/systemd/system/dbsutra-backup.service << 'SERVICE'
[Unit]
Description=DBSutra Daily Backup
[Service]
Type=oneshot
ExecStart=/opt/dbsutra/backup.sh
SERVICE

cat > /etc/systemd/system/dbsutra-backup.timer << 'TIMER'
[Unit]
Description=DBSutra Daily Backup Timer
[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
[Install]
WantedBy=timers.target
SERVICE

systemctl enable dbsutra-backup.timer
systemctl start dbsutra-backup.timer

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== Setup Complete ==="
echo "Databases:"
echo "  PostgreSQL:    localhost:5432"
echo "  MySQL:         localhost:3306"
echo "  Redis:         localhost:6379"
echo "  MongoDB:       localhost:27017"
echo "  Elasticsearch: localhost:9200"
