# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
{
    'name': 'Sweet Café — Gestión Integral',
    'version': '19.0.1.0.0',
    'category': 'Industry',
    'summary': 'Multi-sucursal, Inventario, RRHH Cuba, POS para pastelería',
    'description': """
        Sistema integral de gestión para pastelería / dulcería.
        - Gestión multi-sucursal
        - Control de inventario (mermas, consumo productivo, traspasos)
        - RRHH y nómina adaptada a legislación cubana (escalas salariales, CUP)
        - Punto de venta multi-sucursal
        - Productos con variantes por sabor (Cakes Antillanos, Tartaletas)
        - Seguimiento de lotes y fechas de caducidad
    """,
    'author': 'Sweet Café',
    'website': 'https://sweetcafe.cu',
    'depends': [
        'base',
        'mail',
        'product',
        'stock',
        'mrp',
        'hr',
        'hr_attendance',
        'hr_holidays',
        'point_of_sale',
        'sale_management',
        'purchase',
        'account',
        'uom',
        # Cuban RRHH modules
        'l10n_cu_hr',
        'l10n_cu_hr_contract',
        'l10n_cu_hr_employee_contract',
        'l10n_cu_hr_payroll_movement',
    ],
    'data': [
        # Security — always first
        'security/sweet_security.xml',
        'security/ir.model.access.csv',

        # Configuration data
        'data/sweet_config_data.xml',
        'data/product_categories.xml',
        'data/product_attributes.xml',
        'data/hr_salary_scales.xml',
        'data/sweet_branches.xml',
        'data/sweet_reservation_sequence.xml',

        # Wizard views
        'wizard/scrap_approve_wizard_views.xml',
        'wizard/sweet_onat_wizard_views.xml',

        # Views
        'views/sweet_branch_views.xml',
        'views/hr_salary_scale_views.xml',
        'views/sweet_scrap_views.xml',
        'views/product_template_views.xml',
        'views/hr_employee_views.xml',
        'views/hr_contract_views.xml',
        'views/pos_config_views.xml',
        'views/sweet_reservation_views.xml',
        'views/sweet_onat_report_views.xml',
        'views/sweet_menus.xml',

        # Reports
        'report/report_merma.xml',
        'report/report_nomina_cuba.xml',
    ],
    'demo': [
        'demo/sweet_products_demo.xml',
        'demo/sweet_employees_demo.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'sweet_cafe_management/static/src/scss/backend_branding.scss',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
