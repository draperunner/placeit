import firebase from "firebase";

// `https://europe-west1-mapquiz-app.cloudfunctions.net/quizzes`,
// `http://localhost:5001/mapquiz-app/europe-west1/quizzes`,

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
