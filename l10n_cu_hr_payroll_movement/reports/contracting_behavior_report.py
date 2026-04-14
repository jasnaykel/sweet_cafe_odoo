from datetime import datetime
from odoo import fields, models
from odoo import _


class ContractingBehaviorReport(models.AbstractModel):
    _name = 'report.l10n_cu_hr_payroll_movement.report_contracting_behavior'

    def generate_xlsx_report(self, workbook, data, movement):
        # img_path = get_module_resource('l10n_cu_hr_payroll_movement', 'static', 'src', 'img', 'logo.png')
        company_data_other = data['company_data']
        MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        worksheet = workbook.add_worksheet(_('Report Behavior of the workforce hiring'))

        # Formats
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D9D9D9', 'border': 1, 'align': 'center'})
        body_format = workbook.add_format({'border': 1, 'align': 'center'})
        body_company_format = workbook.add_format({'border': 1})
        footer_format = workbook.add_format({'bold': True, 'bg_color': '#D9D9D9', 'border': 1, 'align': 'center'})
        bold_format = workbook.add_format({'bold': True, 'font_size': 18})

        # Set column widths
        worksheet.set_column('C:C', 5)  # No.
        worksheet.set_column('D:D', 30)  # EMPRESAS
        for col_num in range(4, 16):  # FUERZA DE TRABAJO CONTRATADA (meses)
         worksheet.set_column(col_num, col_num, 5)
        worksheet.set_column('R:R', 20)  # CANTIDAD DE BAJAS
        
         # Header
        # worksheet.insert_image('B2', img_path, {'x_scale': 0.1, 'y_scale': 0.1, 'x_offset': 25, 'y_offset': 10})
        
        worksheet.write('I3', f'COMPORTAMIENTO', bold_format)
        worksheet.write('E4', f'DE LA CONTRATACIÓN DE FUERZA DE TRABAJO AL CIERRE DE:', bold_format)

        date_from = data.get('date_from')
        date_to = data.get('date_to')
        if date_from and date_to:
          date_from = datetime.strptime(date_from, '%Y-%m-%d').strftime('%d-%m-%Y')
          date_to = datetime.strptime(date_to, '%Y-%m-%d').strftime('%d-%m-%Y')
          worksheet.write('H5', f'Desde: {date_from} Hasta: {date_to}', bold_format)

        worksheet.merge_range('C7:C8', 'No.', header_format)
        worksheet.merge_range('D7:D8', 'EMPRESAS', header_format)
        worksheet.merge_range('E7:Q7', 'FUERZA DE TRABAJO CONTRATADA', header_format)
        worksheet.merge_range('R7:R8', 'CANTIDAD DE BAJAS', header_format)
        for i in range(12):
           worksheet.write(7, 4 + i, MONTHS[i], header_format)
           worksheet.write(7, 16, 'TOTAL', header_format) 

        row = 8
        total_altas_other = [0]*12
        total_bajas_other = [0]*12
        # Process the other companies
        for index, company in enumerate(company_data_other):
            total_altas = [0]*12
            total_bajas = [0]*12
            worksheet.write(row, 2, index, body_format)
            worksheet.write(row, 3, company['company_name'], body_company_format)
            for i in range(12):
                altas = company['altas'][i] if company['altas'][i] != 0 else '-'
                bajas = company['bajas'][i] if company['bajas'][i] != 0 else 0
                worksheet.write(row, 4 + i, altas, body_format)
                total_altas[i] += company['altas'][i]
                total_bajas[i] += company['bajas'][i]
                # Sum in total company name to the general total
                total_altas_other[i] += company['altas'][i]
                total_bajas_other[i] += company['bajas'][i]
            worksheet.write(row, 16, sum(total_altas) if sum(total_altas) != 0 else 0, body_format)
            worksheet.write(row, 17, sum(total_bajas) if sum(total_bajas) != 0 else 0, body_format)
            row += 1

        # Fila:  Write the subtotal for the other companies
        if company_data_other:
            worksheet.merge_range(row, 2, row, 3, 'Subtotal  otros usuarios', footer_format)
            for i in range(12):
                worksheet.write(row, 4 + i, total_altas_other[i] if total_altas_other[i] != 0 else '-', footer_format)
                worksheet.write(row, 16, sum(total_altas_other) if sum(total_altas_other) != 0 else 0, footer_format)
                worksheet.write(row, 17, sum(total_bajas_other) if sum(total_bajas_other) != 0 else 0, footer_format)
            row += 1
            # Write the overall total for all companies
        total_altas_all = total_altas_other
        total_bajas_all = total_bajas_other
        # Fila: Write the general total for all companies
        worksheet.merge_range(row, 2, row, 3, 'Total', footer_format)
        for i in range(12):
            worksheet.write(row, 4 + i, total_altas_all[i] if total_altas_all[i] != 0 else '-', footer_format)
            worksheet.write(row, 16, sum(total_altas_all) if sum(total_altas_all) != 0 else 0, footer_format)
            worksheet.write(row, 17, sum(total_bajas_all) if sum(total_bajas_all) != 0 else 0, footer_format)
