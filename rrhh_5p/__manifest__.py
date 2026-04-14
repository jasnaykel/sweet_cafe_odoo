# List of contributors:
# Segu

{
     'name': '5pCuba - HR Contratos',
     'version': '19.0.1.0.0',
     'category': 'Human Resources',
     'summary': """
        Contratos de empleados, Proformas...
     """,
     'description': 'Contratos de trabajadores - Cuba.',
     'author': 'Annis Martinez Dominguez',
     'depends': ["l10n_cu_hr_employee_contract", "l10n_cu_hr_payroll_movement"],
     'auto_install': False,
     'data': [
          "data/paperformat_global.xml",
          "reports/determinate_report_contract_proforma.xml",
          "views/res_company_views.xml",
     ],
     'license': 'LGPL-3',
}
