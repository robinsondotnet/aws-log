export function ensureFunctionName(name) {
    if (!/^[a-zA-Z_]/.test(name) || /[*^&#@!\(\);:'",.?]/.test(name)) {
        const e = new Error(`the function name "${name}" is not valid`);
        e.name = "InvalidName";
        throw (e);
    }
    return name;
}
