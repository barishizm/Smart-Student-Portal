<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/">
  <html>
  <head>
    <title>Student List Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #002e5d; color: white; }
      tr:nth-child(even) { background-color: #f2f2f2; }
      h1 { color: #002e5d; }
    </style>
  </head>
  <body>
    <h1>Student List Report</h1>
    <table>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Surname</th>
        <th>Student ID</th>
        <th>Email</th>
        <th>Group</th>
      </tr>
      <xsl:for-each select="students/student">
      <tr>
        <td><xsl:value-of select="id"/></td>
        <td><xsl:value-of select="name"/></td>
        <td><xsl:value-of select="surname"/></td>
        <td><xsl:value-of select="student_id"/></td>
        <td><xsl:value-of select="email"/></td>
        <td><xsl:value-of select="group"/></td>
      </tr>
      </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>
</xsl:stylesheet>
