# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
"""
Wizard de exportación / importación ONAT.

Export: genera CSV con los datos de la declaración del período.
Import: permite cargar declaraciones previas desde CSV para histórico.
"""
import base64
import csv
import io
from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class SweetOnatExportWizard(models.TransientModel):
    """Exporta la declaración ONAT a CSV."""
    _name = 'sweet.onat.export.wizard'
    _description = 'Exportar Declaración ONAT'

    report_id = fields.Many2one(
        'sweet.onat.report', string='Declaración', required=True,
        default=lambda self: self.env.context.get('active_id'),
    )
    export_format = fields.Selection([
        ('csv', 'CSV (hoja de cálculo)'),
        ('txt', 'TXT (delimitado por comas)'),
    ], string='Formato', default='csv', required=True)

    # Output
    file_data = fields.Binary(string='Archivo', readonly=True)
    file_name = fields.Char(string='Nombre del archivo', readonly=True)
    state = fields.Selection([('draft', 'Listo'), ('done', 'Generado')], default='draft')

    def action_export(self):
        self.ensure_one()
        rep = self.report_id
        months = dict(rep._fields['month'].selection)
        month_name = months.get(rep.month, rep.month)

        rows = [
            ['Declaración ONAT — Sweet Café'],
            ['Empresa', rep.company_id.name],
            ['Período', '%s / %d' % (month_name, rep.year)],
            ['Estado', dict(rep._fields['state'].selection).get(rep.state, rep.state)],
            [],
            ['BASES IMPONIBLES', 'CUP'],
            ['Ingresos Brutos', '%.2f' % rep.gross_income],
            ['Gastos Deducibles', '%.2f' % rep.total_purchases],
            ['Ingresos Netos (Base IS)', '%.2f' % rep.net_income],
            ['Salarios Pagados', '%.2f' % rep.total_wages],
            [],
            ['IMPUESTOS', 'Tasa (%)', 'Importe (CUP)'],
            ['Impuesto sobre Ingresos (IS)', '%.2f' % rep.income_tax_rate, '%.2f' % rep.income_tax],
            ['IUFT (Fuerza de Trabajo)', '%.2f' % rep.labor_tax_rate, '%.2f' % rep.labor_tax],
            ['Contribución SS Empleador', '%.2f' % rep.social_security_rate, '%.2f' % rep.social_security],
            ['Impuesto sobre Ventas', '%.2f' % rep.sales_tax_rate, '%.2f' % rep.sales_tax],
            [],
            ['TOTAL A PAGAR', '', '%.2f' % rep.total_to_pay],
            [],
            ['Observaciones', rep.notes or ''],
        ]

        output = io.StringIO()
        writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_MINIMAL)
        for row in rows:
            writer.writerow(row)

        csv_bytes = output.getvalue().encode('utf-8-sig')  # BOM for Excel compatibility
        file_data = base64.b64encode(csv_bytes)
        ext = 'csv' if self.export_format == 'csv' else 'txt'
        fname = 'ONAT_%s_%d_%s.%s' % (rep.month, rep.year, rep.company_id.name.replace(' ', '_'), ext)

        self.write({'file_data': file_data, 'file_name': fname, 'state': 'done'})
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def action_download(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'url': '/web/content?model=%s&id=%d&field=file_data&filename_field=file_name&download=true' % (
                self._name, self.id,
            ),
            'target': 'self',
        }


class SweetOnatImportWizard(models.TransientModel):
    """Importa declaraciones ONAT históricas desde CSV."""
    _name = 'sweet.onat.import.wizard'
    _description = 'Importar Declaraciones ONAT'

    file_data = fields.Binary(string='Archivo CSV', required=True)
    file_name = fields.Char(string='Nombre del archivo')
    result_summary = fields.Text(string='Resultado', readonly=True)
    state = fields.Selection([('draft', 'Listo'), ('done', 'Procesado')], default='draft')

    def action_import(self):
        self.ensure_one()
        if not self.file_data:
            raise UserError(_('Por favor selecciona un archivo CSV.'))

        raw = base64.b64decode(self.file_data)
        # Handle BOM if present
        try:
            content = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            content = raw.decode('latin-1')

        reader = csv.DictReader(io.StringIO(content))
        required_fields = {'year', 'month', 'gross_income', 'total_wages', 'total_purchases'}
        if not required_fields.issubset(set(reader.fieldnames or [])):
            raise ValidationError(
                _('El CSV debe tener estas columnas: %s') % ', '.join(sorted(required_fields))
            )

        created = 0
        skipped = 0
        errors = []
        for i, row in enumerate(reader, start=2):
            try:
                year = int(row['year'])
                month = str(int(row['month']))
                gross = float(row['gross_income'] or 0)
                wages = float(row['total_wages'] or 0)
                purchases = float(row['total_purchases'] or 0)
                income_rate = float(row.get('income_tax_rate') or 35.0)
                labor_rate = float(row.get('labor_tax_rate') or 5.0)
                ss_rate = float(row.get('social_security_rate') or 14.0)
                sales_rate = float(row.get('sales_tax_rate') or 0.0)
                notes = row.get('notes', '')
            except (ValueError, KeyError) as e:
                errors.append(_('Fila %d: %s') % (i, str(e)))
                continue

            # Skip if already exists
            existing = self.env['sweet.onat.report'].search([
                ('year', '=', year),
                ('month', '=', month),
                ('company_id', '=', self.env.company.id),
            ])
            if existing:
                skipped += 1
                continue

            self.env['sweet.onat.report'].create({
                'year': year,
                'month': month,
                'gross_income': gross,
                'total_wages': wages,
                'total_purchases': purchases,
                'income_tax_rate': income_rate,
                'labor_tax_rate': labor_rate,
                'social_security_rate': ss_rate,
                'sales_tax_rate': sales_rate,
                'notes': notes,
                'state': 'computed',
                'company_id': self.env.company.id,
            })
            created += 1

        summary_parts = [
            _('✅ %d declaraciones importadas.') % created,
            _('⏭️ %d omitidas (ya existen).') % skipped,
        ]
        if errors:
            summary_parts.append(_('❌ Errores:\n') + '\n'.join(errors))

        self.write({'result_summary': '\n'.join(summary_parts), 'state': 'done'})
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }
