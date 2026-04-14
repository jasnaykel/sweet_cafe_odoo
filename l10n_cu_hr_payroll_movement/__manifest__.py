# List of contributors:
# Segu

{
     'name': 'Cuba - HR Movimientos',
     'version': '19.0.1.0.0',
     'category': 'Human Resources',
     'summary': """
        Empleados, Movimientos de Nómina.
     """,
     'author': 'Comunidad Cubana de Odoo / Sweet Café',
     'depends': ["l10n_cu_hr", "l10n_cu_hr_employee_contract"],
     'auto_install': False,     
     'data': [
          "views/details_movement_type_views.xml",
          "views/reasons_movement_type_views.xml",
          "views/hr_contract_views.xml",
          "views/payroll_movement_views.xml",
          "views/hr_employee_views.xml",
          "data/paperformat_global.xml",
          "data/details_movement_type_data.xml",
          "data/reasons_movement_type_data.xml",
          "reports/report_action.xml",
          "reports/report_payroll_movement.xml",
          "wizards/summary_registrations_movements_internals_wizard.xml",
          "wizards/contracting_behavior_wizard.xml",
          "security/ir.model.access.csv"
     ],
     'license': 'LGPL-3',

}
