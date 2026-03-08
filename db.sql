SET default_storage_engine = InnoDB;
DROP DATABASE IF EXISTS `monika_moe`;
CREATE DATABASE IF NOT EXISTS monika_moe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS 'monika_moe';
CREATE USER 'monika_moe' @'localhost' IDENTIFIED BY '1aa016e45eb2183138d3562bf416986b4abbc73b4dafbc9014aa908e8e854f0b';
GRANT ALL PRIVILEGES ON monika_moe.* TO 'monika_moe' @'localhost';
USE monika_moe;