.PHONY: test build dev preview

test:
	npm test -- --run

build:
	npm run build

dev:
	npm run dev

preview:
	npm run preview -- --host 0.0.0.0
