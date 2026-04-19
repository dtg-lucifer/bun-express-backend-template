db:
	docker compose -f docker/docker-compose.yaml up redis postgres

worker:
	docker compose -f docker/docker-compose.yaml up bullmq-worker

infra:
	docker compose -f docker/docker-compose.yaml up redis postgres bullmq-worker

docs:
	bun run docs:build
