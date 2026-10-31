.PHONY: deploy

deploy:
	npx vercel --prod
	@echo "\n🚀 Deployed successfully! Game URLs:"
	@echo "  • Caro:        https://vigga-games.vercel.app/games/caro/"
	@echo "  • Block Blast: https://vigga-games.vercel.app/games/block-blast/"
