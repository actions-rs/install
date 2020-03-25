import * as input from "../src/input";

const testEnvVars = {
    INPUT_CRATE: "cross",
    INPUT_VERSION: "latest",
};

describe("actions-rs/install/input", () => {
    beforeEach(() => {
        for (const key in testEnvVars)
            process.env[key] = testEnvVars[key as keyof typeof testEnvVars];
    });

    it("Parses action input into install input", () => {
        const result = input.get();

        expect(result.crate).toBe("cross");
        expect(result.version).toBe("latest");
    });
});
