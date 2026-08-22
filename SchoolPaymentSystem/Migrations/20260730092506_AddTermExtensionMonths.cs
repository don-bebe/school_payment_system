using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPaymentSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddTermExtensionMonths : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TermExtensionMonth",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TermId = table.Column<int>(type: "int", nullable: false),
                    MonthNumber = table.Column<int>(type: "int", nullable: false),
                    MonthName = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermExtensionMonth", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermExtensionMonth_Term_TermId",
                        column: x => x.TermId,
                        principalTable: "Term",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TermExtensionFee",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TermExtensionMonthId = table.Column<int>(type: "int", nullable: false),
                    GradeId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermExtensionFee", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermExtensionFee_Grade_GradeId",
                        column: x => x.GradeId,
                        principalTable: "Grade",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TermExtensionFee_TermExtensionMonth_TermExtensionMonthId",
                        column: x => x.TermExtensionMonthId,
                        principalTable: "TermExtensionMonth",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TermExtensionFee_GradeId",
                table: "TermExtensionFee",
                column: "GradeId");

            migrationBuilder.CreateIndex(
                name: "IX_TermExtensionFee_TermExtensionMonthId_GradeId",
                table: "TermExtensionFee",
                columns: new[] { "TermExtensionMonthId", "GradeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermExtensionMonth_TermId_MonthNumber",
                table: "TermExtensionMonth",
                columns: new[] { "TermId", "MonthNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TermExtensionFee");

            migrationBuilder.DropTable(
                name: "TermExtensionMonth");
        }
    }
}
