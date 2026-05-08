# -*- coding: utf-8 -*-
{
    'name': 'Sweet Café E-commerce',
    'version': '1.0',
    'category': 'Website/Website',
    'summary': 'Diseño Premium y E-commerce para Sweet Café',
    'description': """
Módulo de personalización del sitio web para Sweet Café.
Incluye:
- Plantillas de página de producto con detalles de pastelería.
- Snippets personalizados de "Sabores" y "Sucursales".
- Tema con paleta de colores inspirada en repostería artesanal.
    """,
    'author': 'Sweet Café',
    'depends': [
        'website',
        'website_sale',
        'sweet_cafe_management',
    ],
    'data': [
        'data/ecommerce_categories.xml',
        'views/website_sale_templates.xml',
        'views/homepage_templates.xml',
        'views/sweet_reservation_templates.xml',
        'views/contact_templates.xml',
        'views/snippets/s_sweet_hero.xml',
        'views/snippets/s_sweet_flavors.xml',
        'views/snippets/s_sweet_about_us.xml',
        'views/snippets/s_sweet_features.xml',
        'views/snippets/s_sweet_branches.xml',
        'views/snippets/s_sweet_custom_order.xml',
        'views/snippets/s_sweet_product_carousel.xml',
        'views/snippets/snippets.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            # SCSS partials — order matters: tokens first (vars/mixins used by all)
            'sweet_cafe_ecommerce/static/src/scss/tokens.scss',
            'sweet_cafe_ecommerce/static/src/scss/layout.scss',
            'sweet_cafe_ecommerce/static/src/scss/components.scss',
            'sweet_cafe_ecommerce/static/src/scss/dark_mode.scss',
            'sweet_cafe_ecommerce/static/src/scss/shop.scss',
            'sweet_cafe_ecommerce/static/src/scss/contact.scss',
            'sweet_cafe_ecommerce/static/src/js/sweet_aurora.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
    'demo': [
        'demo/ecommerce_products_demo.xml',
    ],
}
