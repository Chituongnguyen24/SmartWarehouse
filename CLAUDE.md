# Warehouse Management System

## Project Overview

This project is a Warehouse Management System designed to manage:

- Users and roles
- Products and categories
- Warehouses and inventory
- Import / receiving operations
- Sales orders
- Delivery orders
- Drivers
- Route optimization
- Customers
- Reports and dashboards

The system supports multiple roles and follows a REST API architecture.

---

# Main Roles

The system has the following roles:

## ADMIN

Responsible for:

- User management
- Role management
- System configuration
- Product/category management
- Viewing system-wide reports

## WAREHOUSE_MANAGER

Responsible for:

- Warehouse management
- Inventory management
- Approving warehouse operations
- Managing warehouse staff
- Monitoring stock levels
- Managing delivery operations

## WAREHOUSE_STAFF

Responsible for:

- Receiving goods
- Processing imports
- Processing exports
- Updating inventory
- Stock checking
- Preparing orders

## SALES_STAFF

Responsible for:

- Customer management
- Creating sales orders
- Managing sales orders
- Checking order status
- Creating delivery requests

## DRIVER

Responsible for:

- Viewing assigned deliveries
- Viewing optimized delivery routes
- Updating delivery status
- Confirming successful delivery
- Reporting failed deliveries

## CUSTOMER

Responsible for:

- Viewing products
- Creating orders
- Viewing order history
- Tracking delivery status

---

# System Architecture

The project follows a layered architecture.

```text
Client
   |
   v
REST Controller
   |
   v
Service
   |
   v
Repository
   |
   v
Database