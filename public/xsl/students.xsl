<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" indent="yes" encoding="UTF-8"/>
<xsl:template match="/">
  <html>
  <head>
    <title>Student List Report</title>
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 24px;
        background: #f5f7fb;
        color: #1f2937;
      }
      h1 { color: #002e5d; margin-bottom: 6px; }
      .meta { color: #475569; font-size: 13px; margin-bottom: 18px; }
      table { border-collapse: collapse; width: 100%; background: #ffffff; box-shadow: 0 1px 3px rgba(15, 23, 42, .08); border-radius: 8px; overflow: hidden; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
      th { background-color: #002e5d; color: #ffffff; font-weight: 600; }
      tr:nth-child(even) td { background-color: #f8fafc; }
      .status-active { color: #047857; font-weight: 600; }
      .status-inactive { color: #b91c1c; font-weight: 600; }
      .summary { margin-top: 16px; font-size: 13px; color: #475569; }
    </style>
  </head>
  <body>
    <h1>Student List Report</h1>
    <p class="meta">XML data transformed via XSLT — Smart Student Portal.</p>
    <table>
      <tr>
        <th>#</th>
        <th>Student ID</th>
        <th>Full Name</th>
        <th>Email</th>
        <th>Program / Department</th>
        <th>Year</th>
        <th>Status</th>
      </tr>
      <xsl:for-each select="students/student">
        <tr>
          <td><xsl:value-of select="id"/></td>
          <td><xsl:value-of select="student_id"/></td>
          <td><xsl:value-of select="full_name"/></td>
          <td><xsl:value-of select="email"/></td>
          <td><xsl:value-of select="program_department"/></td>
          <td><xsl:value-of select="year_of_study"/></td>
          <td>
            <xsl:choose>
              <xsl:when test="status = 'Active'">
                <span class="status-active"><xsl:value-of select="status"/></span>
              </xsl:when>
              <xsl:otherwise>
                <span class="status-inactive"><xsl:value-of select="status"/></span>
              </xsl:otherwise>
            </xsl:choose>
          </td>
        </tr>
      </xsl:for-each>
    </table>
    <p class="summary">
      Total students: <xsl:value-of select="count(students/student)"/>
    </p>
  </body>
  </html>
</xsl:template>
</xsl:stylesheet>
