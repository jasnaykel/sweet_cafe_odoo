# -*- coding: utf-8 -*-
"""Extiende el controlador de reservas para vincular diseños del configurador."""
from odoo.http import request
from odoo.addons.sweet_cafe_ecommerce.controllers.main import SweetCafeController


class SweetCafeConfiguratorReservation(SweetCafeController):
    """Hereda el controlador de reservas para:
    1. Pasar datos del diseño al template de reserva.
    2. Vincular el design_id a la línea de reserva al crear.
    """

    def reservation_page(self, **kwargs):
        """Extiende la página de reserva para pre-seleccionar producto del configurador."""
        response = super().reservation_page(**kwargs)
        # Si viene desde el configurador, inyectar datos del diseño
        design_id = kwargs.get('design_id')
        product_id = kwargs.get('product_id')
        if design_id and response.qcontext:
            design = request.env['product.design'].sudo().browse(int(design_id))
            if design.exists():
                response.qcontext['design'] = design
                response.qcontext['preselected_product_id'] = int(product_id) if product_id else design.product_id.id
        return response

    def reservation_submit(self, **post):
        """Extiende el submit para vincular design_id a la línea de reserva."""
        response = super().reservation_submit(**post)

        # Después de crear la reserva, vincular el diseño si viene del configurador
        design_id = post.get('design_id')
        product_id = post.get('design_product_id')
        if design_id and product_id:
            try:
                design_id = int(design_id)
                product_id = int(product_id)
                design = request.env['product.design'].sudo().browse(design_id)
                if design.exists():
                    # Buscar la última reserva creada con este producto
                    # (la que acaba de crear super())
                    last_reservation = request.env['sweet.reservation'].sudo().search(
                        [('origin', '=', 'website')],
                        order='id desc', limit=1,
                    )
                    if last_reservation:
                        line = last_reservation.line_ids.filtered(
                            lambda l: l.product_id.id == product_id
                        )
                        if line:
                            line[0].write({'design_id': design_id})
                            design.write({'state': 'confirmed', 'partner_id': last_reservation.partner_id.id})
            except (ValueError, TypeError):
                pass  # Silently skip if invalid

        return response
