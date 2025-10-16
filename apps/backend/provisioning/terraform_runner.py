# apps/backend/provisioning/terraform_runner.py
import os, shutil, subprocess, tempfile, json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

TERRAFORM_BIN = os.getenv("TERRAFORM_BIN", "terraform")
TEMPLATES_DIR = Path(__file__).parent / "templates"

def _run(cmd, cwd):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out, _ = p.communicate()
    return p.returncode, out

def render_tf_dir(plan: dict) -> str:
    """
    Renderiza un directorio temporal con main.tf, variables.tf y terraform.tfvars.json a partir del plan.
    Retorna la ruta del directorio generado.
    """
    plan = plan or {}
    tmpdir = tempfile.mkdtemp(prefix="tf-plan-")
    tmp = Path(tmpdir)

    # Flag robusto: por defecto simulación
    simulate_only = bool(plan.get("simulate_only", True))

    # Entorno Jinja
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )

    # main.tf -> aquí sí pasamos el flag y el plan completo por si el template lo usa
    main_tpl = env.get_template("main.tf.j2")
    mainRendered = main_tpl.render(
        simulate_only=simulate_only,
        payload=plan,   # por si el template quiere leer algo más
    )
    (tmp / "main.tf").write_text(mainRendered)

    # variables.tf -> no inyectamos var.*, dejamos que el .tf use var.region, etc.
    var_tpl = env.get_template("variables.tf.j2")
    variablesRendered = var_tpl.render()
    (tmp / "variables.tf").write_text(variablesRendered)

    # terraform.tfvars.json derivados
    subnets = plan.get("subnets", [])
    has_public = any(bool(s.get("public")) for s in subnets)

    tfvars = {
        "name": plan.get("name", "tesis"),
        "region": plan.get("region", "us-east-1"),
        "vpc_cidr": plan.get("vpc", {}).get("cidr", "10.0.0.0/16"),
        "has_public": has_public,
        "subnets": [
            {
                "name": s["name"],
                "cidr": s["cidr"],
                "az": s["az"],
                "public": bool(s.get("public", False)),
            }
            for s in subnets
        ],
    }
    (tmp / "terraform.tfvars.json").write_text(json.dumps(tfvars, indent=2))

    # (Opcional) preview para diagnósticos rápidos
    try:
        preview = "".join((tmp / "main.tf").read_text().splitlines(True)[:30])
        (tmp / "_main_preview.txt").write_text(preview)
    except Exception:
        pass

    return tmpdir

def tf_init(workdir: str):
    return _run([TERRAFORM_BIN, "init", "-input=false", "-no-color"], workdir)

def tf_plan(workdir: str):
    # -refresh=false para evitar llamadas innecesarias; -out guarda el plan para apply
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
