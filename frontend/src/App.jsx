import { useEffect, useState } from "react";

import axios from "axios";

import {
  Apple,
  ChefHat,
  Clock,
  Leaf,
  Plus,
  Trash2,
  Sparkles,
  Package,
  RefreshCw,
  AlertTriangle,
  LogIn,
  LogOut,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";

import "./App.css";

const API = "http://localhost:5000";

const categories = [
  "Fruits",

  "Vegetables",

  "Dairy",

  "Grains",

  "Snacks",

  "Other",
];

const units = ["pcs", "kg", "g", "litre", "ml", "pack"];

const initialForm = {
  name: "",

  quantity: "",

  unit: "pcs",

  category: "Fruits",

  expiryDate: "",
};

function App() {
  const [items, setItems] = useState([]);

  const [expiryItems, setExpiryItems] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [recipes, setRecipes] = useState([]);

  const [loadingItems, setLoadingItems] = useState(true);

  const [saving, setSaving] = useState(false);

  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const [loadingRecipeItemId, setLoadingRecipeItemId] = useState(null);

  const [selectedRecipeItem, setSelectedRecipeItem] = useState("");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState("pantry");

  // Login session is kept in the browser so the user stays signed in after refresh.
  const [token, setToken] = useState(
    () => localStorage.getItem("nourishiq_token") || "",
  );
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nourishiq_user") || "null");
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const authConfig = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};

  const loadData = async () => {
    setLoadingItems(true);

    setError("");

    try {
      const [pantryResponse, expiryResponse] = await Promise.all([
        axios.get(`${API}/api/pantry`, authConfig),

        axios.get(`${API}/api/pantry/expiry`, authConfig),
      ]);

      setItems(pantryResponse.data.items || []);

      setExpiryItems(expiryResponse.data.items || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not connect to the backend. Please check that your server is running on port 5000.",
      );
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    } else {
      setLoadingItems(false);
      setItems([]);
      setExpiryItems([]);
    }
  }, [token]);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleAuthChange = (event) => {
    setAuthForm({ ...authForm, [event.target.name]: event.target.value });
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setNotice("");

    try {
      const isSignup = authMode === "signup";
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignup
        ? {
            name: authForm.name.trim(),
            email: authForm.email.trim(),
            password: authForm.password,
          }
        : {
            email: authForm.email.trim(),
            password: authForm.password,
          };

      const response = await axios.post(`${API}${endpoint}`, payload);
      const data = response.data || {};

      if (data.token) {
        const nextUser = data.user || {
          name: authForm.name.trim() || authForm.email.trim(),
          email: authForm.email.trim(),
        };
        localStorage.setItem("nourishiq_token", data.token);
        localStorage.setItem("nourishiq_user", JSON.stringify(nextUser));
        setToken(data.token);
        setUser(nextUser);
        setAuthForm({ name: "", email: "", password: "" });
        setAuthError("");
        setNotice(
          data.message ||
            `Welcome to NourishIQ${nextUser.name ? `, ${nextUser.name}` : ""}!`,
        );
      } else if (isSignup && data.success !== false) {
        setAuthMode("login");
        setAuthForm({ name: "", email: authForm.email.trim(), password: "" });
        setNotice(data.message || "Account created. Please log in.");
      } else {
        throw new Error(
          data.message ||
            "Login did not return an authentication token. Please check your auth route.",
        );
      }
    } catch (err) {
      setAuthError(
        err.response?.data?.message ||
          err.message ||
          "Could not connect to the server. Make sure your backend is running on port 5000.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nourishiq_token");
    localStorage.removeItem("nourishiq_user");
    setToken("");
    setUser(null);
    setItems([]);
    setExpiryItems([]);
    setRecipes([]);
    setActiveTab("pantry");
    setNotice("");
    setError("");
    setAuthError("");
    setAuthMode("login");
    setAuthForm({ name: "", email: "", password: "" });
  };

  const addItem = async (event) => {
    event.preventDefault();

    setSaving(true);

    setError("");

    setNotice("");

    try {
      const payload = {
        ...form,

        quantity: Number(form.quantity),

        expiryDate: form.expiryDate || null,
      };

      const response = await axios.post(
        `${API}/api/pantry`,
        payload,
        authConfig,
      );

      if (response.data.success === false) {
        throw new Error(response.data.message || "Could not add item.");
      }

      setForm(initialForm);

      setNotice("Food item added successfully!");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to add food item.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    setError("");
    setNotice("");

    try {
      await axios.delete(`${API}/api/pantry/${id}`, authConfig);
      setNotice("Food item deleted successfully!");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete this food item.",
      );
    }
  };

  const generateRecipes = async () => {
    setLoadingRecipes(true);
    setLoadingRecipeItemId(null);
    setSelectedRecipeItem("");
    setError("");
    setNotice("");
    setRecipes([]);

    try {
      const response = await axios.get(
        `${API}/api/recipes/ai-suggestions`,
        authConfig,
      );
      const result = response.data.recipes || [];
      setRecipes(result);
      setActiveTab("recipes");

      if (result.length === 0) {
        setNotice("No recipes found. Add some available food items first.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Recipe generation failed. Check your Gemini API key and backend.",
      );
    } finally {
      setLoadingRecipes(false);
    }
  };

  const generateRecipesForItem = async (item) => {
    setLoadingRecipes(true);
    setLoadingRecipeItemId(item._id);
    setSelectedRecipeItem(item.name);
    setError("");
    setNotice("");
    setRecipes([]);

    try {
      const response = await axios.get(`${API}/api/recipes/ai-suggestions`, {
        ...authConfig,
        params: { itemId: item._id },
      });

      const result = response.data.recipes || [];
      setRecipes(result);
      setActiveTab("recipes");

      if (result.length === 0) {
        setNotice(
          `No recipes found for ${item.name}. Try another pantry item.`,
        );
      } else {
        setNotice(`Showing recipes made especially for ${item.name}.`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Could not generate recipes for ${item.name}. Please try again.`,
      );
    } finally {
      setLoadingRecipes(false);
      setLoadingRecipeItemId(null);
    }
  };

  const availableItems = items.filter((item) => item.status === "available");

  const expiringCount = expiryItems.filter((item) => {
    const status = String(item.expiryStatus || "").toLowerCase();

    return status.includes("expired") || status.includes("soon");
  }).length;

  const getExpiryStatus = (item) => {
    if (item.expiryStatus) return item.expiryStatus;

    if (!item.expiryDate) return "No expiry date";

    const expiry = new Date(item.expiryDate);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    expiry.setHours(0, 0, 0, 0);

    const days = Math.ceil((expiry - today) / 86400000);

    if (days < 0) return "Expired";

    if (days <= 3) return "Expiring Soon";

    return "Fresh";
  };

  const statusClass = (status) => {
    const normalized = String(status).toLowerCase();

    if (normalized.includes("expired")) return "expired";

    if (normalized.includes("soon")) return "soon";

    if (normalized.includes("fresh")) return "fresh";

    return "neutral";
  };

  const formatDate = (date) => {
    if (!date) return "Not set";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "Not set";

    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",

      month: "short",

      year: "numeric",
    });
  };

  const getRecipeTitle = (recipe) =>
    recipe.name || recipe.title || recipe.recipeName || "Healthy Recipe";

  const getRecipeDescription = (recipe) =>
    recipe.description || recipe.summary || recipe.reason || "";

  const getRecipeIngredients = (recipe) =>
    recipe.ingredients || recipe.requiredIngredients || [];

  const getRecipeSteps = (recipe) =>
    recipe.steps || recipe.instructions || recipe.method || [];

  const renderList = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) =>
        typeof entry === "string"
          ? entry
          : entry.name || entry.step || JSON.stringify(entry),
      );
    }

    if (typeof value === "string" && value.trim()) {
      return value.split(/\n+/).filter(Boolean);
    }

    return [];
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />
        <div className="auth-layout">
          <section className="auth-story">
            <a className="brand auth-brand" href="#auth-home">
              <span className="brand-icon">
                <Leaf size={25} />
              </span>
              <span>
                <strong>NourishIQ</strong>
                <small>SMART FOOD, LESS WASTE</small>
              </span>
            </a>

            <span className="auth-kicker">
              <Sparkles size={15} /> YOUR SMART KITCHEN STARTS HERE
            </span>
            <h1>
              Good food.
              <br />
              Smarter choices.
            </h1>
            <p>
              Keep your pantry organized, stay ahead of expiry dates, and
              discover meal ideas made from ingredients you already have.
            </p>
            <div className="auth-benefits">
              <div>
                <span className="auth-benefit-icon">
                  <Package size={18} />
                </span>
                <span>
                  <strong>One simple pantry</strong>
                  <small>Track the food you have at home.</small>
                </span>
              </div>
              <div>
                <span className="auth-benefit-icon">
                  <Clock size={18} />
                </span>
                <span>
                  <strong>Less food waste</strong>
                  <small>Know what needs to be used first.</small>
                </span>
              </div>
              <div>
                <span className="auth-benefit-icon">
                  <ChefHat size={18} />
                </span>
                <span>
                  <strong>AI recipe ideas</strong>
                  <small>Find inspiration from your ingredients.</small>
                </span>
              </div>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-card-heading">
              <span className="auth-card-icon">
                {authMode === "login" ? (
                  <LogIn size={22} />
                ) : (
                  <UserPlus size={22} />
                )}
              </span>
              <p className="eyebrow">
                {authMode === "login" ? "WELCOME BACK" : "JOIN NOURISHIQ"}
              </p>
              <h2>
                {authMode === "login"
                  ? "Sign in to your account"
                  : "Create your account"}
              </h2>
              <p>
                {authMode === "login"
                  ? "Enter your details to continue to your pantry."
                  : "A few details and your smarter kitchen is ready."}
              </p>
            </div>

            {authError && (
              <div className="auth-error" role="alert">
                <AlertTriangle size={17} />
                <span>{authError}</span>
              </div>
            )}
            {notice && (
              <div className="auth-notice" role="status">
                <Leaf size={17} />
                <span>{notice}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "signup" && (
                <label>
                  Full name
                  <input
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    placeholder="Enter your name"
                    minLength={2}
                    required
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label>
                Password
                <span className="password-field">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      authMode === "login" ? "current-password" : "new-password"
                    }
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder={
                      authMode === "signup"
                        ? "Create a password"
                        : "Enter your password"
                    }
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                {authMode === "signup" && (
                  <small className="field-hint">
                    Use at least 6 characters.
                  </small>
                )}
              </label>

              <button
                className="primary-button auth-submit"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Sign in"
                    : "Create account"}
                {!authLoading &&
                  (authMode === "login" ? (
                    <LogIn size={17} />
                  ) : (
                    <UserPlus size={17} />
                  ))}
              </button>
            </form>

            <div className="auth-switch">
              {authMode === "login"
                ? "New to NourishIQ?"
                : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                  setNotice("");
                  setShowPassword(false);
                }}
              >
                {authMode === "login" ? "Create account" : "Sign in"}
              </button>
            </div>
            <p className="auth-privacy">
              Your kitchen, organized in one place.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-icon">
            <Leaf size={25} />
          </span>

          <span>
            <strong>NourishIQ</strong>

            <small>SMART FOOD, LESS WASTE</small>
          </span>
        </a>

        <p className="nav-label">WORKSPACE</p>

        <button
          className={`nav-link ${activeTab === "pantry" ? "selected" : ""}`}
          onClick={() => setActiveTab("pantry")}
        >
          <Package size={19} />
          My Pantry
        </button>

        <button
          className={`nav-link ${activeTab === "expiry" ? "selected" : ""}`}
          onClick={() => setActiveTab("expiry")}
        >
          <Clock size={19} />
          Expiry Tracker
          {expiringCount > 0 && (
            <span className="nav-count">{expiringCount}</span>
          )}
        </button>

        <button
          className={`nav-link ${activeTab === "recipes" ? "selected" : ""}`}
          onClick={() => setActiveTab("recipes")}
        >
          <ChefHat size={19} />
          AI Recipes
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={20} />

            <strong>Small changes, big impact.</strong>

            <p>Use what you have. Waste less. Eat smarter.</p>
          </div>

          <p className="sidebar-footer">NourishIQ · Eat thoughtfully</p>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL FOOD ASSISTANT</p>

            <h1>Eat smart. Waste less.</h1>
          </div>

          <div className="topbar-actions">
            <span className="signed-in-user">
              <span className="user-avatar">
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </span>
              <span className="user-greeting">
                <strong>{user?.name || "Welcome back"}</strong>
                <small>{user?.email || "Signed in"}</small>
              </span>
            </span>
            <button className="refresh-button" onClick={loadData}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="message error-message">
            <AlertTriangle size={18} />

            <span>{error}</span>

            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="message success-message">
            <Leaf size={18} />

            <span>{notice}</span>

            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="banner-tag">
              <Sparkles size={14} /> YOUR KITCHEN, REIMAGINED
            </span>

            <h2>Make every ingredient count.</h2>

            <p>
              Keep track of your food, stay ahead of expiry dates, and discover
              recipes powered by AI.
            </p>

            <button
              className="primary-button banner-button"
              onClick={() => {
                setActiveTab("recipes");

                generateRecipes();
              }}
              disabled={loadingRecipes}
            >
              <Sparkles size={17} />

              {loadingRecipes ? "Generating..." : "Discover AI Recipes"}
            </button>
          </div>

          <div className="banner-art">
            <div className="art-circle">
              <Apple size={72} strokeWidth={1.25} />
            </div>

            <span className="floating-leaf leaf-one">
              <Leaf size={24} />
            </span>

            <span className="floating-leaf leaf-two">
              <Leaf size={18} />
            </span>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon green-icon">
              <Package size={21} />
            </span>

            <p>Total food items</p>

            <strong>{loadingItems ? "—" : items.length}</strong>

            <small>Tracked in your pantry</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon orange-icon">
              <Clock size={21} />
            </span>

            <p>Expiry alerts</p>

            <strong>{loadingItems ? "—" : expiringCount}</strong>

            <small>Expired or expiring soon</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon purple-icon">
              <ChefHat size={21} />
            </span>

            <p>AI recipes</p>

            <strong>{recipes.length}</strong>

            <small>Recipes generated this session</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon yellow-icon">
              <Leaf size={21} />
            </span>

            <p>Available items</p>

            <strong>{loadingItems ? "—" : availableItems.length}</strong>

            <small>Ready to use</small>
          </article>
        </section>

        <div className="content-heading">
          <div>
            <p className="eyebrow">YOUR KITCHEN</p>

            <h2>
              {activeTab === "pantry" && "Pantry overview"}

              {activeTab === "expiry" && "Expiry tracker"}

              {activeTab === "recipes" && "AI recipe studio"}
            </h2>
          </div>

          {activeTab !== "recipes" && (
            <button className="text-button" onClick={loadData}>
              <RefreshCw size={15} /> Update data
            </button>
          )}
        </div>

        {activeTab === "pantry" && (
          <div className="pantry-layout">
            <section className="panel add-panel">
              <div className="panel-heading">
                <span className="panel-heading-icon">
                  <Plus size={19} />
                </span>

                <div>
                  <h3>Add food item</h3>

                  <p>Keep your pantry up to date.</p>
                </div>
              </div>

              <form onSubmit={addItem} className="food-form">
                <label>
                  Food name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Tomatoes"
                    required
                  />
                </label>

                <div className="form-row">
                  <label>
                    Quantity
                    <input
                      name="quantity"
                      type="number"
                      min="0.01"
                      step="any"
                      value={form.quantity}
                      onChange={handleChange}
                      placeholder="e.g. 2"
                      required
                    />
                  </label>

                  <label>
                    Unit
                    <select
                      name="unit"
                      value={form.unit}
                      onChange={handleChange}
                    >
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Expiry date <span className="optional">(optional)</span>
                  <input
                    name="expiryDate"
                    type="date"
                    value={form.expiryDate}
                    onChange={handleChange}
                  />
                </label>

                <button
                  className="primary-button submit-button"
                  disabled={saving}
                >
                  <Plus size={17} />

                  {saving ? "Adding item..." : "Add to pantry"}
                </button>
              </form>
            </section>

            <section className="panel inventory-panel">
              <div className="panel-heading inventory-heading">
                <div>
                  <h3>Your food inventory</h3>

                  <p>{items.length} items tracked</p>
                </div>

                <span className="inventory-badge">
                  <Leaf size={14} /> Pantry
                </span>
              </div>

              {loadingItems ? (
                <div className="empty-state">
                  <RefreshCw className="spin-icon" size={26} />

                  <p>Loading your pantry...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <Package size={35} />

                  <h4>Your pantry is waiting!</h4>

                  <p>Add your first food item using the form.</p>
                </div>
              ) : (
                <div className="food-list">
                  {items.map((item) => {
                    const status = getExpiryStatus(item);

                    return (
                      <article className="food-row" key={item._id}>
                        <div className="food-emoji">
                          {item.category === "Fruits"
                            ? "🍎"
                            : item.category === "Vegetables"
                              ? "🥦"
                              : item.category === "Dairy"
                                ? "🥛"
                                : item.category === "Grains"
                                  ? "🌾"
                                  : item.category === "Snacks"
                                    ? "🥨"
                                    : "🍽️"}
                        </div>

                        <div className="food-info">
                          <strong>{item.name}</strong>

                          <span>
                            {item.quantity} {item.unit} · {item.category}
                          </span>

                          <small>Expiry: {formatDate(item.expiryDate)}</small>
                        </div>

                        <div className="food-actions">
                          <span
                            className={`status-pill ${statusClass(status)}`}
                          >
                            {status}
                          </span>

                          {item.status === "available" &&
                            !String(status)
                              .toLowerCase()
                              .includes("expired") && (
                              <button
                                className="item-recipe-button"
                                onClick={() => generateRecipesForItem(item)}
                                disabled={loadingRecipes}
                                title={`Generate recipes for ${item.name} only`}
                              >
                                <Sparkles size={14} />
                                {loadingRecipeItemId === item._id
                                  ? "Creating..."
                                  : "Recipes"}
                              </button>
                            )}

                          <button
                            className="delete-button"
                            onClick={() => deleteItem(item._id)}
                            aria-label={`Delete ${item.name}`}
                            title="Delete item"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "expiry" && (
          <section className="panel full-panel">
            <div className="panel-heading">
              <span className="panel-heading-icon orange-icon">
                <Clock size={20} />
              </span>

              <div>
                <h3>Food freshness check</h3>

                <p>Check which ingredients need your attention.</p>
              </div>
            </div>

            {loadingItems ? (
              <div className="empty-state">Loading expiry dates...</div>
            ) : expiryItems.length === 0 ? (
              <div className="empty-state">
                <Leaf size={35} />

                <h4>No expiry dates to track</h4>

                <p>Add food items with expiry dates to see them here.</p>
              </div>
            ) : (
              <div className="expiry-grid">
                {expiryItems.map((item) => {
                  const status = getExpiryStatus(item);

                  return (
                    <article className="expiry-card" key={item._id}>
                      <div className="expiry-card-top">
                        <span className="food-emoji">🥬</span>

                        <span className={`status-pill ${statusClass(status)}`}>
                          {status}
                        </span>
                      </div>

                      <h4>{item.name}</h4>

                      <p>
                        {item.quantity} {item.unit} · {item.category}
                      </p>

                      <div className="expiry-date">
                        <Clock size={15} />
                        Expires: {formatDate(item.expiryDate)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "recipes" && (
          <section className="recipe-section">
            <div className="recipe-intro panel">
              <div>
                <span className="banner-tag">
                  <Sparkles size={14} /> GEMINI AI
                </span>

                <h3>What's cooking today?</h3>

                <p>
                  {selectedRecipeItem
                    ? `These recipes focus on ${selectedRecipeItem} as the main ingredient.`
                    : "Get recipe ideas using the available, non-expired ingredients in your pantry."}
                </p>
              </div>

              <button
                className="primary-button"
                onClick={generateRecipes}
                disabled={loadingRecipes}
              >
                <Sparkles size={17} />

                {loadingRecipes ? "Creating recipes..." : "Generate recipes"}
              </button>
            </div>

            {loadingRecipes && (
              <div className="panel recipe-loading">
                <span className="loading-orb">
                  <Sparkles size={25} />
                </span>

                <h3>Your AI chef is thinking...</h3>

                <p>
                  {selectedRecipeItem
                    ? `Gemini is creating recipe ideas focused on ${selectedRecipeItem}. This may take a little while.`
                    : "Gemini is finding ways to turn your ingredients into tasty meals. This may take a little while."}
                </p>
              </div>
            )}

            {!loadingRecipes && recipes.length === 0 && (
              <div className="panel empty-state recipe-empty">
                <ChefHat size={42} />

                <h3>Your next meal starts here.</h3>

                <p>
                  Add some available food items, then generate recipes with AI.
                </p>
              </div>
            )}

            {!loadingRecipes && recipes.length > 0 && (
              <div className="recipes-grid">
                {recipes.map((recipe, index) => {
                  const ingredients = renderList(getRecipeIngredients(recipe));

                  const steps = renderList(getRecipeSteps(recipe));

                  return (
                    <article className="panel recipe-card" key={index}>
                      <div className="recipe-card-top">
                        <span className="recipe-number">
                          RECIPE {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="recipe-sparkle">
                          <Sparkles size={17} />
                        </span>
                      </div>

                      <h3>{getRecipeTitle(recipe)}</h3>

                      {getRecipeDescription(recipe) && (
                        <p className="recipe-description">
                          {getRecipeDescription(recipe)}
                        </p>
                      )}

                      {recipe.prepTime && (
                        <p className="recipe-meta">
                          <Clock size={15} /> {recipe.prepTime}
                        </p>
                      )}

                      {ingredients.length > 0 && (
                        <div className="recipe-details">
                          <h4>Ingredients</h4>

                          <ul>
                            {ingredients.map((ingredient, i) => (
                              <li key={i}>{ingredient}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {steps.length > 0 && (
                        <div className="recipe-details">
                          <h4>How to prepare</h4>

                          <ol>
                            {steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer className="main-footer">
          <span>
            <Leaf size={15} /> NourishIQ
          </span>

          <p>Think Smart. Eat Fresh. Waste Less.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
