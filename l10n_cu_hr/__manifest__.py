# List of contributors:
# Segu

{
     'name': 'Cuba - RRHH',
     'version': '19.0.1.0.0',
     'category': 'Human Resources/Localization',
     'summary': """
        Empleados, tarjetas de asistencias y datos maestros de Cuba.
     """,
     'author': 'Comunidad Cubana de Odoo / Sweet Café',
     'depends': ["hr", "l10n_cu_address"],
     'auto_install': False,     
     'data': [
          "security/partner_rules.xml",
          "security/accsess_security.xml",
          "security/ir.model.access.csv",
          "data/hr_data.xml",
          "data/resource_data.xml",
          "data/schooling_level_data.xml",
          "data/occupational_category_data.xml",
          "views/res_users_views.xml",
          "views/hr_job_views.xml",
          "views/assistance_cards_template.xml",
          "views/schooling_level_views.xml",
          "views/profession_views.xml",
          "views/occupational_category_views.xml",
          "views/hr_employee_views.xml",
          "views/hr_work_location_views.xml",
          "views/hr_department_views.xml",
          "views/resource_calendar_views.xml",
          "views/hr_contract_type_view_tree.xml",
          "reports/report_assistance_cards.xml",
          "wizards/assistance_cards_wizard.xml",
          
           
     ],
     'license': 'LGPL-3',
}
