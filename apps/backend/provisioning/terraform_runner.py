#/apps/backend/provisioning/terraform_runner.py
import os, shutil, subprocess, tempfile, json, uuid
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

TERRAFORM_BIN = os.getenv("TERRAFORM_BIN", "terraform")

def _run(cmd, cwd):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out, _ = p.communicate()
    return p.returncode, out

def render_tf_dir(plan: dict) -> str:
    """
    Renderiza un directorio temporal con main.tf y variables.tf a partir del plan.
    Retorna la ruta del dir.
    """
    tmpdir = tempfile.mkdtemp(prefix="tf-plan-")
    env = Environment(loader=FileSystemLoader(str(Path(__file__).parent / "templates")))

    # NO pasamos 'var' a Jinja; las referencias a var.* deben quedar literales en el .tf
    main_tpl = env.get_template("main.tf.j2")
    main = main_tpl.render()
    (Path(tmpdir) / "main.tf").write_text(main)

    var_tpl = env.get_template("variables.tf.j2")
    variables = var_tpl.render()
    (Path(tmpdir) / "variables.tf").write_text(variables)

    # Derivados para tfvars
    subnets = plan.get("subnets", [])
    has_public = any(s.get("public") for s in subnets)

    tfvars = {
        "name": plan["name"],
        "region": plan["region"],
        "vpc_cidr": plan["vpc"]["cidr"],
        "has_public": has_public,
        "subnets": [
            {
                "name": s["name"],
                "cidr": s["cidr"],
                "az": s["az"],
                "public": bool(s["public"]),
            }
            for s in subnets
        ],
    }
    (Path(tmpdir) / "terraform.tfvars.json").write_text(json.dumps(tfvars, indent=2))
    return tmpdir


def tf_init(workdir: str):
    return _run([TERRAFORM_BIN, "init", "-input=false"], workdir)

def tf_plan(workdir: str):
    return _run([TERRAFORM_BIN, "plan", "-input=false", "-refresh=false", "-no-color", "-out", "plan.out"], workdir)

def tf_apply(workdir: str):
    return _run([TERRAFORM_BIN, "apply", "-input=false", "-no-color", "plan.out"], workdir)


def tf_destroy(workdir: str):
    return _run([TERRAFORM_BIN, "destroy", "-auto-approve", "-input=false", "-no-color"], workdir)

def cleanup(workdir: str):
    try:
      shutil.rmtree(workdir, ignore_errors=True)
    except Exception:
      pass
