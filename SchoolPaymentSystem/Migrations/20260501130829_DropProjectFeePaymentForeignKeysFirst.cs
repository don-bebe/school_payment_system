using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPaymentSystem.Migrations
{
    /// <inheritdoc />
    using Microsoft.EntityFrameworkCore.Migrations;

public partial class DropProjectFeePaymentForeignKeysFirst : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // First, drop the foreign key constraints
        // Note: These names might be different in your database
        migrationBuilder.Sql(@"
            -- Drop foreign key for StudentId if it exists
            SET @fk_name = (
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'ProjectFeePayment' 
                AND COLUMN_NAME = 'StudentId'
                AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1
            );
            
            SET @sql = IF(@fk_name IS NOT NULL, 
                CONCAT('ALTER TABLE `ProjectFeePayment` DROP FOREIGN KEY `', @fk_name, '`'),
                'SELECT 1');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        ");
        
        migrationBuilder.Sql(@"
            -- Drop foreign key for AcademicYearId if it exists
            SET @fk_name = (
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'ProjectFeePayment' 
                AND COLUMN_NAME = 'AcademicYearId'
                AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1
            );
            
            SET @sql = IF(@fk_name IS NOT NULL, 
                CONCAT('ALTER TABLE `ProjectFeePayment` DROP FOREIGN KEY `', @fk_name, '`'),
                'SELECT 1');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        ");
        
        migrationBuilder.Sql(@"
            -- Drop foreign key for PaymentId if it exists
            SET @fk_name = (
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'ProjectFeePayment' 
                AND COLUMN_NAME = 'PaymentId'
                AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1
            );
            
            SET @sql = IF(@fk_name IS NOT NULL, 
                CONCAT('ALTER TABLE `ProjectFeePayment` DROP FOREIGN KEY `', @fk_name, '`'),
                'SELECT 1');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        ");
        
        // Now drop the index
        migrationBuilder.Sql(@"
            ALTER TABLE `ProjectFeePayment` DROP INDEX `IX_ProjectFeePayment_StudentId_AcademicYearId`;
        ");
        
        // Re-add the foreign keys without requiring the composite index
        migrationBuilder.AddForeignKey(
            name: "FK_ProjectFeePayment_Student_StudentId",
            table: "ProjectFeePayment",
            column: "StudentId",
            principalTable: "Student",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
            
        migrationBuilder.AddForeignKey(
            name: "FK_ProjectFeePayment_AcademicYear_AcademicYearId",
            table: "ProjectFeePayment",
            column: "AcademicYearId",
            principalTable: "AcademicYear",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
            
        migrationBuilder.AddForeignKey(
            name: "FK_ProjectFeePayment_Payment_PaymentId",
            table: "ProjectFeePayment",
            column: "PaymentId",
            principalTable: "Payment",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Remove the new foreign keys
        migrationBuilder.DropForeignKey(
            name: "FK_ProjectFeePayment_Student_StudentId",
            table: "ProjectFeePayment");
            
        migrationBuilder.DropForeignKey(
            name: "FK_ProjectFeePayment_AcademicYear_AcademicYearId",
            table: "ProjectFeePayment");
            
        migrationBuilder.DropForeignKey(
            name: "FK_ProjectFeePayment_Payment_PaymentId",
            table: "ProjectFeePayment");
        
        // Recreate the original index
        migrationBuilder.CreateIndex(
            name: "IX_ProjectFeePayment_StudentId_AcademicYearId",
            table: "ProjectFeePayment",
            columns: new[] { "StudentId", "AcademicYearId" });
            
        // Note: The original foreign keys will be recreated by EF in subsequent migrations
    }
}
}
