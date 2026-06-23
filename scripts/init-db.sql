-- ═══════════════════════════════════════════════════════
-- FreshKeep (SFWMS) - Database initialization script
-- Creates one database per microservice (Database per Service)
-- ═══════════════════════════════════════════════════════

-- Core service databases
CREATE DATABASE sfwms_core;
CREATE DATABASE sfwms_product;
CREATE DATABASE sfwms_inventory;
CREATE DATABASE sfwms_warehouse;

-- Inbound/Outbound databases
CREATE DATABASE sfwms_inbound;
CREATE DATABASE sfwms_outbound;

-- IoT & Alert databases
CREATE DATABASE sfwms_iot;
CREATE DATABASE sfwms_alert;

-- Transport & Report databases
CREATE DATABASE sfwms_transport;
CREATE DATABASE sfwms_report;

-- Auth/User database
CREATE DATABASE sfwms_auth;
