.
├── Makefile
├── README.md
├── apps
│   ├── backend
│   │   ├── api
│   │   │   ├── **init**.py
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   ├── migrations
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── tasks.py
│   │   │   ├── tests.py
│   │   │   ├── urls.py
│   │   │   ├── validators.py
│   │   │   ├── views.py
│   │   │   └── views_plans.py
│   │   ├── examples
│   │   │   └── network_plan.simple.json
│   │   ├── manage.py
│   │   ├── provisioning
│   │   │   ├── templates
│   │   │   ├── __init__.py
│   │   │   └── terraform_runner.py
│   │   ├── requirements.txt
│   │   ├── teg
│   │   │   ├── **init**.py
│   │   │   ├── asgi.py
│   │   │   ├── celery.py
│   │   │   ├── settings.py
│   │   │   ├── urls.py
│   │   │   └── wsgi.py
│   └── frontend
│   ├── README.md
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── public
│   │   ├── \_redirects
│   │   └── vite.svg
│   ├── requestuseregister.rest
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── assets
│   │   ├── components
│   │   ├── config
│   │   ├── constants.js
│   │   ├── contexts
│   │   ├── features
│   │   ├── firebase
│   │   ├── index.css
│   │   ├── lib
│   │   ├── main.jsx
│   │   ├── mocks
│   │   ├── pages
│   │   ├── services
│   │   ├── styles
│   │   ├── theme
│   │   └── utils
│   └── vite.config.js
├── case-01-single-vpc.json
├── cleanup_vpcs_extras.sh
├── destroy_vpcs.sh
├── documentacion.txt
├── estructura.md
├── infra
│   ├── bootstrap
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   └── versions.tf
│   └── terraform
│   ├── README.md
│   ├── alb.tf
│   ├── backend.tf
│   ├── ecr.tf
│   ├── ecs.tf
│   ├── iam_github_oidc.tf
│   ├── iam_task_role.tf
│   ├── outputs.tf
│   ├── providers.tf
│   ├── rds.tf
│   ├── redis.tf
│   ├── s3.tf
│   ├── secrets.tf
│   ├── security_groups.tf
│   ├── services.tf
│   ├── tasks.tf
│   ├── tf.plan
│   ├── tfplan
│   ├── var.database_url_secret_arn
│   ├── variables.tf
│   ├── versions.tf
│   └── vpc.tf
├── multi-tgw-demo.json
├── payload.apply.min.json
├── payload.min.json
├── plan.demo.json
├── plan_demo.json
├── scripts
│   ├── aws-control.sh
│   ├── set_backend_url.sh
│   └── test_celery.sh
├── tesis_vlan_deployment.md
├── testsdeploy.json
├── tools
│   └── docker
│   ├── backend.Dockerfile
│   ├── base.terraform.Dockerfile
│   ├── celery.Dockerfile
│   ├── compose.dev.yml
│   ├── flower.Dockerfile
│   └── frontend.Dockerfile
└── var.database_url_secret_arn

40 directories, 104 files
