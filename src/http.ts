import firebase from "firebase";

export async function post(url: string, data: any): Promise<any> {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    console.log("No current user");
    return;
  }

  const token = await currentUser.getIdToken();

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  }).then((res) => res.json());
}
