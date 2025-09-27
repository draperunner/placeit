import firebase from "firebase/app";

export async function post<T>(url: string, data: object): Promise<T> {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    console.log("No current user");
    throw new Error("No current user");
  }

  const token = await currentUser.getIdToken();

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<T>);
}
