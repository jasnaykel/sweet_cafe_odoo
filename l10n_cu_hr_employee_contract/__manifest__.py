# List of contributors:
# Segu

{
     'name': 'Cuba - HR Contratos de Empleados',
     'version': '19.0.1.0.0',
     'category': 'Human Resources',
     'summary': """
        Contratos de empleados, Movimientos de Nómina.
     """,
     'description': 'Contratos de trabajadores - Cuba.',
     'author': 'Comunidad Cubana de Odoo / Sweet Café',
     'depends': ["hr", "l10n_cu_hr", "l10n_cu_hr_contract"],
     'auto_install': False,
     'data': [
          "views/determined_contract_type_views.xml",
          "views/hr_job_views.xml",
          "views/hr_employee_views.xml",
          "views/hr_contract_views.xml",
          "views/res_company_views.xml",
          "data/paperformat_global.xml",
          "data/determinate_contract_type_data.xml",
          "data/sequence_data.xml",
          "reports/report_contract_proforma.xml",
          "reports/report_contract_supplier.xml",
          "reports/report_fixed_term_contract.xml",
          "security/ir.model.access.csv",
     ],
     'license': 'LGPL-3',
}
