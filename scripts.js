
const transactionForm = document.getElementById("transactionForm");

const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");
const currentBalanceElement = document.getElementById("currentBalance");

const transactionTableBody = document.getElementById("transactionTableBody");
const transactionCount = document.getElementById("transactionCount");
const filterType = document.getElementById("filterType");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");

// Set today's date as the default date.
dateInput.value = getTodayDate();

// Display the current year in the footer.
document.getElementById("currentYear").textContent =
    new Date().getFullYear();

// Load saved transactions from localStorage.
let transactions = loadTransactions();


// ------------------------------
// Helper Functions
// ------------------------------

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function loadTransactions() {
    try {
        const savedTransactions = localStorage.getItem("transactions");

        if (!savedTransactions) {
            return [];
        }

        const parsedTransactions = JSON.parse(savedTransactions);

        // Check that the saved data is an array.
        if (!Array.isArray(parsedTransactions)) {
            return [];
        }

        // Ignore invalid records.
        return parsedTransactions.filter((transaction) => {
            return (
                transaction &&
                typeof transaction.id === "string" &&
                ["income", "expense"].includes(transaction.type) &&
                typeof transaction.description === "string" &&
                transaction.description.trim() !== "" &&
                typeof transaction.amount === "number" &&
                Number.isFinite(transaction.amount) &&
                transaction.amount > 0 &&
                typeof transaction.category === "string" &&
                typeof transaction.date === "string"
            );
        });
    } catch (error) {
        console.error("Could not load transactions:", error);
        return [];
    }
}

function saveTransactions() {
    try {
        localStorage.setItem(
            "transactions",
            JSON.stringify(transactions)

        )
        alert("Transaction Added Successfully!");
        ;
    } catch (error) {
        console.error("Could not save transactions:", error);

        alert(
            "Your changes could not be saved in this browser. " +
            "Check your browser storage settings."
        );
    }
}

function formatCurrency(amount) {
    return "LKR " + amount.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-");

    return `${day}/${month}/${year}`;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}


// ------------------------------
// Add Transaction
// ------------------------------

transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const type = typeInput.value;
    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;

    // Validate the form.
    if (
        !["income", "expense"].includes(type) ||
        description === "" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        category === "" ||
        !date ||
        !Number.isFinite(Date.parse(date))
    ) {
        alert("Please complete all fields with valid values.");
        return;
    }

    // Prevent future dates.
    if (date > getTodayDate()) {
        alert("The transaction date cannot be in the future.");
        return;
    }

    // Create a transaction object.
    const transaction = {
        id: createTransactionId(),
        type: type,
        description: description,
        amount: amount,
        category: category,
        date: date
    };

    // Add the new transaction.
    transactions.push(transaction);

    // Save and refresh the interface.
    saveTransactions();
    updateDashboard();

    // Reset the form.
    transactionForm.reset();
    dateInput.value = getTodayDate();
});

function createTransactionId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}


// ------------------------------
// Calculate Summary Totals
// ------------------------------

function calculateTotals() {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(function (transaction) {
        if (transaction.type === "income") {
            totalIncome += transaction.amount;
        } else {
            totalExpenses += transaction.amount;
        }
    });

    return {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        balance: totalIncome - totalExpenses
    };
}

function updateSummary() {
    const totals = calculateTotals();

    totalIncomeElement.textContent =
        formatCurrency(totals.totalIncome);

    totalExpensesElement.textContent =
        formatCurrency(totals.totalExpenses);

    currentBalanceElement.textContent =
        formatCurrency(totals.balance);

    // Indicate whether the balance is positive or negative.
    currentBalanceElement.style.color =
        totals.balance < 0 ? "#dc2626" : "#1f2937";
}


// ------------------------------
// Display Transactions
// ------------------------------

function displayTransactions() {
    transactionTableBody.replaceChildren();

    const selectedType = filterType.value;
    const searchTerm = searchInput.value.trim().toLowerCase();

    // Apply the selected filter and search.
    const filteredTransactions = transactions
        .filter(function (transaction) {
            const matchesType =
                selectedType === "all" ||
                transaction.type === selectedType;

            const matchesSearch = [
                transaction.description,
                transaction.category,
                transaction.type,
                transaction.date
            ].some(function (value) {
                return value.toLowerCase().includes(searchTerm);
            });

            return matchesType && matchesSearch;
        })
        // Display the newest dates first.
        .sort(function (a, b) {
            return b.date.localeCompare(a.date) ||
                b.id.localeCompare(a.id);
        });

    // Update the transaction count.
    transactionCount.textContent =
        `${filteredTransactions.length} ` +
        (filteredTransactions.length === 1
            ? "transaction"
            : "transactions");

    // Show an appropriate empty state.
    if (filteredTransactions.length === 0) {
        emptyState.style.display = "block";

        const heading = emptyState.querySelector("h3");
        const message = emptyState.querySelector("p");

        if (transactions.length === 0) {
            heading.textContent = "No transactions yet";
            message.textContent =
                "Add your first transaction to see it here.";
        } else {
            heading.textContent = "No matching transactions";
            message.textContent =
                "Try changing your search or filter.";
        }

        return;
    }

    emptyState.style.display = "none";

    // Create a table row for every transaction.
    filteredTransactions.forEach(function (transaction) {
        const row = document.createElement("tr");

        // Date
        row.appendChild(
            createElement("td", "", formatDate(transaction.date))
        );

        // Description
        row.appendChild(
            createElement("td", "", transaction.description)
        );

        // Transaction type
        const typeCell = document.createElement("td");

        const typeBadge = createElement(
            "span",
            `type-badge type-${transaction.type}`,
            transaction.type === "income" ? "Income" : "Expense"
        );

        typeCell.appendChild(typeBadge);
        row.appendChild(typeCell);

        // Category
        row.appendChild(
            createElement("td", "", transaction.category)
        );

        // Amount
        const amountCell = createElement(
            "td",
            `amount-cell amount-column ${
                transaction.type === "income"
                    ? "income-amount"
                    : "expense-amount"
            }`,
            `${transaction.type === "income" ? "+" : "-"}${
                formatCurrency(transaction.amount)
            }`
        );

        row.appendChild(amountCell);

        // Delete button
        const actionCell = document.createElement("td");

        const deleteButton = createElement(
            "button",
            "delete-btn",
            "Delete"
        );

        deleteButton.type = "button";
        deleteButton.dataset.id = transaction.id;
        deleteButton.setAttribute(
            "aria-label",
            `Delete transaction: ${transaction.description}`
        );

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        transactionTableBody.appendChild(row);
    });
}


// ------------------------------
// Delete Transaction
// ------------------------------

transactionTableBody.addEventListener("click", function (event) {
    const deleteButton = event.target.closest(".delete-btn");

    if (!deleteButton) {
        return;
    }

    const transactionId = deleteButton.dataset.id;

    const transaction = transactions.find(function (item) {
        return item.id === transactionId;
    });

    if (!transaction) {
        return;
    }

    const confirmed = confirm(
        `Delete "${transaction.description}"?`
    );

    if (!confirmed) {
        return;
    }

    transactions = transactions.filter(function (item) {
        return item.id !== transactionId;
    });

    saveTransactions();
    updateDashboard();
});


// ------------------------------
// Filter and Search
// ------------------------------

filterType.addEventListener("change", function () {
    displayTransactions();
});

searchInput.addEventListener("input", function () {
    displayTransactions();
});


// ------------------------------
// Clear Form
// ------------------------------

transactionForm.addEventListener("reset", function () {
    // The reset event fires before the form's values are reset.
    setTimeout(function () {
        dateInput.value = getTodayDate();
    }, 0);
});


// ------------------------------
// Update the Entire Dashboard
// ------------------------------

function updateDashboard() {
    updateSummary();
    displayTransactions();
}


// Initial display when the page loads.
updateDashboard();
