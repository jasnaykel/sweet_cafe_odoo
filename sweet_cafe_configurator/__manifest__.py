# -*- coding: utf-8 -*-
{
    'name': 'Sweet Café — Configurador de Productos con IA',
    'version': '19.0.1.0.0',
    'category': 'Website/Website',
    'summary': 'Configurador visual de pasteles con generación de imagen IA y editor interactivo',
    'description': """
Permite a los clientes personalizar productos (pasteles, tartas, etc.) con un
configurador visual paso a paso:

1. Selección de características (pisos, sabor, decoración, color, extras).
2. Generación automática de imagen base usando IA (Stability, Leonardo, etc.).
3. Editor interactivo tipo juego (Fabric.js) para mover adornos, añadir texto,
   cambiar colores y ajustar la decoración.
4. Exportación del diseño final como imagen PNG adjunta a la reserva/pedido.
    """,
    'author': 'Sweet Café',
    'depends': [
        'base_setup',
        'sweet_cafe_ecommerce',
        'sweet_cafe_management',
    ],
    'data': [
        'security/ir.model.access.csv',
        'security/product_design_rules.xml',
        'data/configurator_data.xml',
        'views/product_design_views.xml',
        'views/configurator_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'sweet_cafe_configurator/static/lib/fabric.min.js',
            'sweet_cafe_configurator/static/src/scss/configurator.scss',
            'sweet_cafe_configurator/static/src/js/configurator.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
