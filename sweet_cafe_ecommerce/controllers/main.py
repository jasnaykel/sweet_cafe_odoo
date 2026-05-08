# -*- coding: utf-8 -*-
from odoo import http, _
from odoo.http import request
from datetime import date, timedelta


class SweetCafeController(http.Controller):

    # ─────────────────────────────────────────────
    # Reservation pages
    # ─────────────────────────────────────────────

    @http.route('/reservar', type='http', auth='public', website=True, sitemap=True)
    def reservation_page(self, **kwargs):
        """Public reservation form."""
        products = request.env['product.template'].sudo().search([
            ('sale_ok', '=', True),
        ], order='name asc')
        branches = request.env['sweet.branch'].sudo().search([('active', '=', True)])
        min_date = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        return request.render('sweet_cafe_ecommerce.reservation_form', {
            'products': products,
            'branches': branches,
            'min_date': min_date,
            'error': kwargs.get('error'),
            'success': kwargs.get('success'),
        })

    @http.route('/reservar/enviar', type='http', auth='public', website=True, methods=['POST'], csrf=True)
    def reservation_submit(self, **post):
        """Handle reservation form submission."""
        Reservation = request.env['sweet.reservation'].sudo()
        Partner = request.env['res.partner'].sudo()

        name = post.get('name', '').strip()
        email = post.get('email', '').strip()
        phone = post.get('phone', '').strip()
        _branch_raw = post.get('branch_id', '').strip()
        branch_id = int(_branch_raw) if _branch_raw and _branch_raw.isdigit() else 0
        delivery_date = post.get('delivery_date', '')
        delivery_time = post.get('delivery_time', '').strip()
        customer_notes = post.get('customer_notes', '').strip()
        product_ids = request.httprequest.form.getlist('product_ids')
        quantities = request.httprequest.form.getlist('quantities')
        flavors = request.httprequest.form.getlist('flavors')

        # Basic validation
        if not name or not email or not branch_id or not delivery_date or not product_ids:
            return request.redirect('/reservar?error=campos_requeridos')

        # Validate delivery_date is a real future date
        try:
            requested_date = date.fromisoformat(delivery_date)
        except (ValueError, TypeError):
            return request.redirect('/reservar?error=fecha_invalida')
        if requested_date <= date.today():
            return request.redirect('/reservar?error=fecha_invalida')

        # Find or create partner
        partner = Partner.search([('email', '=', email)], limit=1)
        if not partner:
            partner = Partner.create({
                'name': name,
                'email': email,
                'phone': phone,
                'customer_rank': 1,
            })

        # Build order lines — validate min_advance_days per product
        lines = []
        for i, pid in enumerate(product_ids):
            try:
                pid = int(pid)
                qty = float(quantities[i]) if i < len(quantities) else 1.0
                if qty <= 0:
                    continue
                flavor = flavors[i] if i < len(flavors) else ''
            except (ValueError, IndexError):
                continue
            product = request.env['product.template'].sudo().browse(pid)
            if not product.exists():
                continue
            # Respect min_advance_days: the delivery date must be at least
            # product.min_advance_days days in the future from today.
            min_advance = product.min_advance_days or 0
            if min_advance > 0:
                min_allowed = date.today() + timedelta(days=min_advance)
                if requested_date < min_allowed:
                    return request.redirect(
                        '/reservar?error=anticipo_insuficiente&product=%s&days=%d'
                        % (product.name, min_advance)
                    )
            lines.append((0, 0, {
                'product_id': pid,
                'qty': qty,
                'unit_price': product.list_price,
                'flavor': flavor,
            }))

        if not lines:
            return request.redirect('/reservar?error=sin_productos')

        reservation = Reservation.create({
            'partner_id': partner.id,
            'branch_id': branch_id,
            'delivery_date': delivery_date,
            'delivery_time': delivery_time,
            'customer_notes': customer_notes,
            'line_ids': lines,
            'origin': 'website',
        })
        reservation.message_post(body=_('Reserva recibida desde el sitio web.'))

        return request.redirect('/reservar/gracias?ref=%s' % reservation.name)

    @http.route('/reservar/gracias', type='http', auth='public', website=True)
    def reservation_thanks(self, ref='', **kwargs):
        """Thank you page after reservation."""
        return request.render('sweet_cafe_ecommerce.reservation_thanks', {
            'ref': ref,
        })

    @http.route('/reservar/estado', type='http', auth='public', website=True, sitemap=False)
    def reservation_status(self, ref='', **kwargs):
        """Public page to check reservation status by reference."""
        reservation = None
        if ref:
            reservation = request.env['sweet.reservation'].sudo().search(
                [('name', '=', ref)], limit=1,
            )
        return request.render('sweet_cafe_ecommerce.reservation_status', {
            'reservation': reservation,
            'ref': ref,
        })

    # ─────────────────────────────────────────────
    # Best sellers API (JSON for homepage widget)
    # ─────────────────────────────────────────────

    @http.route('/sweet/best-sellers', type='jsonrpc', auth='public', website=True)
    def best_sellers(self, limit=8, **kwargs):
        """Returns top N best-selling products with stock info."""
        SaleReport = request.env['sale.report'].sudo()
        result = SaleReport.read_group(
            domain=[('state', 'in', ('sale', 'done'))],
            fields=['product_tmpl_id', 'product_uom_qty:sum'],
            groupby=['product_tmpl_id'],
            orderby='product_uom_qty desc',
            limit=limit,
        )
        products = []
        for r in result:
            tmpl = request.env['product.template'].sudo().browse(r['product_tmpl_id'][0])
            if not tmpl.exists() or not tmpl.active:
                continue
            stock_qty = sum(
                tmpl.product_variant_ids.mapped('qty_available')
            )
            products.append({
                'id': tmpl.id,
                'name': tmpl.name,
                'price': tmpl.list_price,
                'image_url': '/web/image/product.template/%d/image_512' % tmpl.id,
                'url': '/shop/product/%d' % tmpl.id,
                'qty_sold': r.get('product_uom_qty', 0),
                'stock_qty': stock_qty,
                'available': stock_qty > 0,
            })
        return products

    # ─────────────────────────────────────────────
    # Add to cart (HTTP wrapper — /shop/cart/update is jsonrpc in Odoo 17+)
    # ─────────────────────────────────────────────

    @http.route('/sweet/cart/add', type='jsonrpc', auth='public', website=True,
                methods=['POST'], csrf=False)
    def sweet_cart_add(self, product_id=None, add_qty=1, **kwargs):
        """Adds a product to the cart and returns the new cart quantity.

        Called via fetch() from the carousels. Returns JSON so the page can
        update the header badge without a full redirect.
        """
        if not product_id:
            return {'error': 'no product_id'}
        try:
            product_id = int(product_id)
            add_qty = int(float(add_qty)) if add_qty else 1
        except (ValueError, TypeError):
            return {'error': 'invalid params'}

        order = request.cart or request.website._create_cart()
        order.with_context(skip_cart_verification=True)._cart_add(
            product_id=product_id,
            quantity=add_qty,
        )
        qty = order.cart_quantity
        # Persist quantity in session so the header badge is correct on every
        # subsequent page load (Odoo reads 'website_sale_cart_quantity' from session).
        request.session['website_sale_cart_quantity'] = qty
        return {
            'cart_quantity': qty,
        }
