# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class ProductTemplate(models.Model):
    """Extends product.template with pastry / bakery-specific fields.

    Adds a dedicated "Pastelería" tab on the product form showing:
    - Baking/preparation time and temperature
    - Sweet Café product category (for filtering)
    - Whether it requires refrigeration/freezing
    - Shelf life days (non-lot products)
    """
    _inherit = 'product.template'

    is_pastry = fields.Boolean(
        string='Producto de Pastelería',
        default=False,
        help='Marcar si este producto es elaborado en pastelería (requiere receta / BOM)',
    )
    sweet_product_type = fields.Selection(
        selection=[
            ('cake', 'Cake / Pastel'),
            ('tartaleta', 'Tartaleta'),
            ('galleta', 'Galleta / Macaron'),
            ('dulce', 'Dulce Tradicional'),
            ('bebida', 'Bebida'),
            ('regalo', 'Cesta / Regalo'),
            ('insumo', 'Insumo / Materia Prima'),
            ('otro', 'Otro'),
        ],
        string='Tipo Sweet Café',
        default='otro',
        help='Clasificación interna del producto para pastry management',
    )
    baking_time = fields.Float(
        string='Tiempo de Elaboración (h)',
        help='Tiempo estimado de elaboración / horneado en horas',
    )
    baking_temp = fields.Float(
        string='Temperatura Horneado (°C)',
        help='Temperatura de horno requerida en grados Celsius',
    )
    requires_refrigeration = fields.Boolean(
        string='Requiere Refrigeración',
        default=False,
        help='El producto debe almacenarse refrigerado (2–8 °C)',
    )
    requires_freezing = fields.Boolean(
        string='Requiere Congelación',
        default=False,
        help='El producto debe almacenarse congelado (< 0 °C)',
    )
    shelf_life_days = fields.Integer(
        string='Vida Útil (días)',
        help='Días de vida útil desde la elaboración (para productos sin lote)',
    )
    custom_order = fields.Boolean(
        string='Admite Pedido Personalizado',
        default=False,
        help='El cliente puede especificar sabor, decoración, tamaño u otras opciones',
    )
    min_advance_days = fields.Integer(
        string='Días Mínimos de Anticipo',
        default=0,
        help='Días de anticipación mínimos para hacer el pedido de este producto',
    )
