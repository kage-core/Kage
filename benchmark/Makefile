RUN ?= results/run
ARM ?= kage
LIMIT ?= 5

.PHONY: install smoke pilot full score report clean

install:
	pip install -r requirements.txt

# No-Docker sanity check: confirms deps import, dataset loads, and (if kage is
# installed) the memory layer is reachable. Does NOT call the model or score.
smoke:
	python smoke.py

# Generation only (writes predictions + token/time metrics). No Docker needed.
pilot:
	python run_ablation.py --arm both --limit $(LIMIT) --out $(RUN)

full:
	python run_ablation.py --arm both --full --out $(RUN)

# Scoring (resolution rate) via the official SWE-bench harness. NEEDS DOCKER.
score:
	bash score.sh $(ARM) $(RUN)

report:
	python report.py $(RUN)

clean:
	rm -rf $(RUN)/_work_* $(RUN)/_repo_cache
