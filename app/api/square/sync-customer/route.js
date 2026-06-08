import { Client, Environment } from 'square';

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production, 
});

export async function POST(request) {
  const { email } = await request.json();

  try {
    // 1. Search Square for a customer with this email
    const response = await client.customersApi.searchCustomers({
      query: { filter: { emailAddress: { exact: email } } }
    });

    let squareId;

    if (response.result.customers && response.result.customers.length > 0) {
      // 2. Match Found! Use existing Square ID
      squareId = response.result.customers[0].id;
    } else {
      // 3. No Match? Create a brand new customer in Square
      const createResponse = await client.customersApi.createCustomer({
        emailAddress: email,
        referenceId: 'NBHD_CLUB_APP' // Tag them so you know where they came from
      });
      squareId = createResponse.result.customer.id;
    }

    return Response.json({ square_customer_id: squareId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
