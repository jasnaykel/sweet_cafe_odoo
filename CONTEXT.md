# Technical & Domain Context - Sweet Café

This document contains the source of truth for terminology and business logic context for the Sweet Café project.

## 🇨🇺 Cuban Fiscal Domain (Localización)

- **ONAT**: Oficina Nacional de Administración Tributaria. Ente regulador de impuestos.
- **NIT**: Número de Identificación Tributaria. Identificador único de la empresa ante la ONAT.
- **IS (Impuesto sobre Utilidades)**: Impuesto progresivo basado en tramos de ingresos netos anuales.
- **IUFT (Impuesto por Utilización de la Fuerza de Trabajo)**: Impuesto basado en la nómina de empleados.
- **CSS (Contribución a la Seguridad Social)**: 14% de aporte del empleador sobre la base salarial.
- **CUP**: Peso Cubano (moneda principal para contabilidad legal).
- **MLC**: Moneda Libremente Convertible (moneda virtual para pagos digitales, tratada como divisa).

## 🍰 Business Domain (Sweet Café)

- **Configurador de Diseños**: Herramienta interactiva (Fabric.js + AI) para que clientes personalicen pasteles.
- **Reserva/Pedido**: Un compromiso de compra que se origina en el e-commerce o POS.
- **Mermas**: Productos que se pierden por caducidad o daño, requieren flujo de aprobación.

## 🛠️ Odoo Technical Domain

- **odoo-19.0**: Repositorio base de Odoo. Contiene `odoo/addons/base`, `odoo/addons/web`, etc.
- **sweet_cafe_management**: Módulo núcleo que extiende `res.company` con campos fiscales.
- **sweet_cafe_configurator**: Módulo de IA y edición gráfica.

## 🤝 Relationships

- El **Ingreso Neto** se calcula como `Ingresos Totales - Gastos Deducibles`.
- Las **Declaraciones Mensuales** se consolidan en la **Declaración Jurada Anual**.
- Un **Diseño** generado en el configurador se vincula a una **Línea de Reserva**.
