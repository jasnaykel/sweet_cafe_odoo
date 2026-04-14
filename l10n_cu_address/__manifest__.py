{
    'name': 'Cuba - Address Localization',
    'version': '19.0.1.0.0',
    'category': 'Localization',
    'summary': 'Provincias y Municipios de Cuba.',
    'author': 'Sweet Café (Migrated)',
    'depends': ['base', 'l10n_cu'],
    'data': [
        'security/ir.model.access.csv',
        'data/res_municipality_data.xml',
        'views/res_municipality_views.xml',
    ],
    'installable': True,
    'license': 'LGPL-3',
}
