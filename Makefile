db:
	docker compose -f docker/docker-compose.yaml up redis postgres

worker:
	docker compose -f docker/docker-compose.yaml up bullmq-worker

infra:
	docker compose -f docker/docker-compose.yaml up redis postgres bullmq-worker

docs:
	bun run docs:build

help:
	@echo "Available targets:"
	@awk -F: '/^[a-zA-Z0-9][a-zA-Z0-9_-]*:/ {print "  " $$1}' Makefile
