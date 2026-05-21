/**
 * Google Sheets API Integration Service
 */

export interface Attendee {
  name: string;
  email: string;
  phone: string;
  quizCompleted: string;
  score: string;
  timestamp: string;
}

/**
 * Creates a brand new Google Sheet spreadsheet on user's Google Drive.
 */
export async function createSpreadsheet(accessToken: string, title: string): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errorText}`);
  }

  const data = await response.json();
  return data.spreadsheetId;
}

/**
 * Initializes the header columns under Sheet1.
 */
export async function initializeSheetHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  const range = 'Sheet1!A1:F1';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        ['Full Name', 'Email Address', 'Phone Number', 'Quiz Complete', 'Quiz Score', 'Timestamp']
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to initialize headers:', errorText);
  }
}

/**
 * Appends a row of attendee data to the end of the sheet.
 */
export async function appendAttendeeRow(
  accessToken: string, 
  spreadsheetId: string, 
  attendee: Attendee
): Promise<void> {
  const range = 'Sheet1!A:F';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [
        [
          attendee.name,
          attendee.email,
          attendee.phone,
          attendee.quizCompleted,
          attendee.score,
          attendee.timestamp
        ]
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append attendee to Sheet: ${errorText}`);
  }
}

/**
 * Fetches all matching attendee rows from the Sheet.
 */
export async function fetchAttendeeRows(accessToken: string, spreadsheetId: string): Promise<Attendee[]> {
  const range = 'Sheet1!A2:F1000';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch sheets data: ${errorText}`);
  }

  const data = await response.json();
  if (!data.values || data.values.length === 0) {
    return [];
  }

  return data.values.map((row: any[]) => ({
    name: row[0] || '',
    email: row[1] || '',
    phone: row[2] || '',
    quizCompleted: row[3] || 'No',
    score: row[4] || 'N/A',
    timestamp: row[5] || ''
  }));
}
