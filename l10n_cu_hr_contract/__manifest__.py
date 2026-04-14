# List of contributors:
# Segu

{
     'name': 'Cuba - HR Contratos',
     'version': '19.0.1.0.0',
     'category': 'Human Resources',
     'summary': """
        Contratos de empleados, régimen de contribución.
     """,
     'description': 'Contratos de trabajadores - Cuba.',
     'author': 'Comunidad Cubana de Odoo / Sweet Café',
     'depends': ["hr", "l10n_cu_hr"],
     'auto_install': False,
     'data': [          
          "views/hr_contract_views.xml",
          "data/hr_contract_type_data.xml",
     ],
     'license': 'LGPL-3',
}
