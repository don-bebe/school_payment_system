using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace SchoolPaymentSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeOverridesAndTransportPartial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Drop the FK that references the unique index we want to change ─────────
            // MySQL won't drop an index that backs a FK, so we must drop the FK first.
            migrationBuilder.DropForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment");

            // ── 2. Drop the unique index ──────────────────────────────────────────────────
            migrationBuilder.DropIndex(
                name: "IX_TransportFeePayment_StudentId_TermMonthId",
                table: "TransportFeePayment");

            // ── 3. Add new columns to TransportFeePayment ────────────────────────────────
            migrationBuilder.AddColumn<int>(
                name: "TotalSchoolDays",
                table: "TransportFeePayment",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DaysEntitled",
                table: "TransportFeePayment",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TransportStartDate",
                table: "TransportFeePayment",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "TransportFeePayment",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── 4. Re-create the index as NON-unique ─────────────────────────────────────
            migrationBuilder.CreateIndex(
                name: "IX_TransportFeePayment_StudentId_TermMonthId",
                table: "TransportFeePayment",
                columns: new[] { "StudentId", "TermMonthId" });

            // ── 5. Re-add the FK against the now non-unique index ────────────────────────
            migrationBuilder.AddForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // ── 6. Create StudentFeeOverride table ───────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "StudentFeeOverride",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    AcademicYearId = table.Column<int>(type: "int", nullable: false),
                    TermMonthId = table.Column<int>(type: "int", nullable: true),
                    OverrideTuitionAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ForceStaffChildRate = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    Reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedById = table.Column<string>(type: "varchar(450)", maxLength: 450, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentFeeOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentFeeOverride_Student_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Student",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentFeeOverride_AcademicYear_AcademicYearId",
                        column: x => x.AcademicYearId,
                        principalTable: "AcademicYear",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentFeeOverride_TermMonth_TermMonthId",
                        column: x => x.TermMonthId,
                        principalTable: "TermMonth",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_StudentFeeOverride_StudentId_AcademicYearId",
                table: "StudentFeeOverride",
                columns: new[] { "StudentId", "AcademicYearId" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentFeeOverride_AcademicYearId",
                table: "StudentFeeOverride",
                column: "AcademicYearId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentFeeOverride_TermMonthId",
                table: "StudentFeeOverride",
                column: "TermMonthId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop StudentFeeOverride
            migrationBuilder.DropTable(name: "StudentFeeOverride");

            // Drop new transport columns
            migrationBuilder.DropColumn(name: "TotalSchoolDays",     table: "TransportFeePayment");
            migrationBuilder.DropColumn(name: "DaysEntitled",        table: "TransportFeePayment");
            migrationBuilder.DropColumn(name: "TransportStartDate",  table: "TransportFeePayment");
            migrationBuilder.DropColumn(name: "Notes",               table: "TransportFeePayment");

            // Drop the FK again so we can swap the index back to unique
            migrationBuilder.DropForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment");

            // Drop non-unique index and restore unique
            migrationBuilder.DropIndex(
                name: "IX_TransportFeePayment_StudentId_TermMonthId",
                table: "TransportFeePayment");

            migrationBuilder.CreateIndex(
                name: "IX_TransportFeePayment_StudentId_TermMonthId",
                table: "TransportFeePayment",
                columns: new[] { "StudentId", "TermMonthId" },
                unique: true);

            // Re-add the FK
            migrationBuilder.AddForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
