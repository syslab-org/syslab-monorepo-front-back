# apps/backend/provisioning/terraform_runner.py
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

TERRAFORM_BIN = os.getenv("TERRAFORM_BIN", "terraform")
TEMPLATES_DIR = Path(__file__).parent / "templates"

def _run(cmd, cwd):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out, _ = p.communicate()
    return p.returncode, out

def render_tf_dir(plan: dict) -> str:
    plan = plan or {}
    tmpdir = tempfile.mkdtemp(prefix="tf-multi-")
    tmp = Path(tmpdir)

    # dump del payload para inspección
    try:
        (tmp / "_received_plan.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    except Exception:
        pass

    simulate_only = bool(plan.get("simulate_only", True))

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )

    main_tpl = env.get_template("main.tf.j2")
    mainRendered = main_tpl.render(
        simulate_only=simulate_only,
        payload=plan,
    )
    (tmp / "main.tf").write_text(mainRendered)

    # variables.tf (aunque el main no lo use directamente)
    var_tpl = env.get_template("variables.tf.j2")
    (tmp / "variables.tf").write_text(var_tpl.render())

    # preview (primeras 200 líneas)
    try:
        preview = "".join((tmp / "main.tf").read_text().splitlines(True)[:200])
        (tmp / "_main_preview.txt").write_text(preview)
    except Exception:
        pass

    return tmpdir

def tf_init(workdir: str):
    return _run([TERRAFORM_BIN, "init", "-input=false", "-no-color"], workdir)

def tf_plan(workdir: str):
    return _run([TERRAFORM_BIN, "plan", "-input=false", "-refresh=false", "-no-color", "-out", "plan.out"], workdir)

def tf_apply(workdir: str):
    return _run([TERRAFORM_BIN, "apply", "-input=false", "-no-color", "plan.out"], workdir)

def tf_destroy(workdir: str):
    return _run([TERRAFORM_BIN, "destroy", "-auto-approve", "-input=false", "-no-color"], workdir)

def cleanup(workdir: str):
    try:
        if os.getenv("KEEP_TF_DIRS", "0") == "1":
            return
        shutil.rmtree(workdir, ignore_errors=True)
    except Exception:
        pass
