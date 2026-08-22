using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPaymentSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddTermMonthFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Drop FK before dropping its index (MySQL requires this order) ──────────
            migrationBuilder.DropForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentFeeOverride_AcademicYear_AcademicYearId",
                table: "StudentFeeOverride");

            // ── Now safe to drop indexes ──────────────────────────────────────────────
            migrationBuilder.DropIndex(
                name: "IX_TransportFeePayment_StudentId_TermMonthId",
                table: "TransportFeePayment");

            migrationBuilder.DropIndex(
                name: "IX_StudentFeeOverride_StudentId_AcademicYearId",
                table: "StudentFeeOverride");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_AcademicYear_TempId",
                table: "AcademicYear");

            migrationBuilder.DropColumn(
                name: "TempId",
                table: "AcademicYear");

            // ── Column alterations ────────────────────────────────────────────────────
            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "StudentFeeOverride",
                type: "tinyint(1)",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<bool>(
                name: "ForceStaffChildRate",
                table: "StudentFeeOverride",
                type: "tinyint(1)",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "AcademicYear",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            // ── Create TermMonthFee table ─────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "TermMonthFee",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TermFeeId = table.Column<int>(type: "int", nullable: false),
                    TermMonthId = table.Column<int>(type: "int", nullable: false),
                    OverrideAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermMonthFee", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermMonthFee_TermFee_TermFeeId",
                        column: x => x.TermFeeId,
                        principalTable: "TermFee",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TermMonthFee_TermMonth_TermMonthId",
                        column: x => x.TermMonthId,
                        principalTable: "TermMonth",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // ── Recreate indexes ──────────────────────────────────────────────────────
            migrationBuilder.CreateIndex(
                name: "IX_TransportFeePayment_StudentId",
                table: "TransportFeePayment",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentFeeOverride_StudentId",
                table: "StudentFeeOverride",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_TermMonthFee_TermFeeId_TermMonthId",
                table: "TermMonthFee",
                columns: new[] { "TermFeeId", "TermMonthId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermMonthFee_TermMonthId",
                table: "TermMonthFee",
                column: "TermMonthId");

            // ── Restore FKs ───────────────────────────────────────────────────────────
            migrationBuilder.AddForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_StudentFeeOverride_AcademicYear_AcademicYearId",
                table: "StudentFeeOverride",
                column: "AcademicYearId",
                principalTable: "AcademicYear",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment");

            migrationBuilder.DropForeignKey(
                name: "FK_StudentFeeOverride_AcademicYear_AcademicYearId",
                table: "StudentFeeOverride");

            migrationBuilder.DropTable(
                name: "TermMonthFee");

            migrationBuilder.DropIndex(
                name: "IX_TransportFeePayment_StudentId",
                table: "TransportFeePayment");

            migrationBuilder.DropIndex(
                name: "IX_StudentFeeOverride_StudentId",
                table: "StudentFeeOverride");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "StudentFeeOverride",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)");

            migrationBuilder.AlterColumn<bool>(
                name: "ForceStaffChildRate",
                table: "StudentFeeOverride",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "tinyint(1)");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "AcademicYear",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AddColumn<int>(
                name: "TempId",
                table: "AcademicYear",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_AcademicYear_TempId",
                table: "AcademicYear",
                column: "TempId");

            migrationBuilder.CreateIndex(
                name: "IX_TransportFeePayment_StudentId_TermMonthId",
                table: "TransportFeePayment",
                columns: new[] { "StudentId", "TermMonthId" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentFeeOverride_StudentId_AcademicYearId",
                table: "StudentFeeOverride",
                columns: new[] { "StudentId", "AcademicYearId" });

            migrationBuilder.AddForeignKey(
                name: "FK_TransportFeePayment_Student_StudentId",
                table: "TransportFeePayment",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_StudentFeeOverride_AcademicYear_AcademicYearId",
                table: "StudentFeeOverride",
                column: "AcademicYearId",
                principalTable: "AcademicYear",
                principalColumn: "TempId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
