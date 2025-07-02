// src/store/storeReducer.js
export const initialStore = () => ({
  message: null,
  access_token: null,
  isLoginSuccessful: false,
  isLoggedIn: false,
  isSignUpSuccessful: false,
  steamLinked: null,          // ← NEW LINE
  todos: [
    { id: 1, title: "Make the bed", background: null },
    { id: 2, title: "Do my homework", background: null }
  ]
});

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "set_hello":
      return { ...store, message: action.payload };

    case "add_task":
      const { id, color } = action.payload;
      return {
        ...store,
        todos: store.todos.map(t =>
          t.id === id ? { ...t, background: color } : t
        )
      };

    case "fetchedToken":
      const { message, token, isLoginSuccessful, loggedIn } = action.payload;
      return {
        ...store,
        message,
        access_token: token,
        isLoginSuccessful,
        isLoggedIn: loggedIn
      };

    case "loggedOut":
      return {
        ...store,
        message: null,
        access_token: null,
        isLoginSuccessful: false,
        isLoggedIn: false
      };

    /* 🚀 NEW: save Steam payload */
    case "steamLinked":
      return {
        ...store,
        steamLinked: action.payload
      };
      case "steamLinked":
      return { ...state, steamLinked: action.payload };

    default:

      return store;
  }
}
