{
     'name': 'Cuba - Nóminas',
     'version': '19.0.1.0.0',
     'category': 'Human Resources/Payroll',
     'summary': """
        Estructuras y reglas salariales, proyecciones de salarios (Odoo 19).
     """,
     'author': 'Comunidad Cubana de Odoo / Sweet Café',
     'depends': ["l10n_cu_hr", "om_hr_payroll"],
     'data': [
          "data/hr_payroll_data.xml",
          "data/hr.salary.rule.csv",
          "security/ir.model.access.csv",
          "views/hr_payslip_views.xml",
          "views/hr_employee_views.xml",
          "views/hr_projection_views.xml",
          "views/report_projection_template.xml",
          "views/report_payslip_run_template.xml",
          "views/res_config_settings_views.xml",
          "reports/hr_payroll_report.xml",
          "wizard/hr_payroll_projection_wizard.xml",
     ],
     'license': 'LGPL-3',
}
