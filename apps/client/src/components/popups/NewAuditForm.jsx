import React, { useState } from "react";
import { authentication } from "../../store/zustant/useZustandHook";
import { Loading } from "../loading/Loading";

function NewAuditForm({  onClose }) {
const {registerAudit,loading,getAuditHistory} = authentication();
  const [form, setForm] = useState(
     {
      contractName: "MyContract",
      sourceType: "paste",
      sourceCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RiskyVault {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function withdraw(address payable recipient) external {
        require(tx.origin == owner, "not owner");
        (bool ok, ) = recipient.call{value: address(this).balance}("");
        require(ok, "transfer failed");
    }

    function execute(address target, bytes calldata data) external {
        target.delegatecall(data);
    }
}`,
      githubUrl:
        "https://github.com/example/protocol/blob/main/contracts/Vault.sol",
    }
  );

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await registerAudit(form);
    await getAuditHistory();
    onClose(true);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-[#0f0f0f] p-4 text-sm text-gray-200 sm:p-6"
    >
      <h2 className="mb-2 text-lg font-semibold text-white">
        New Smart Contract Audit
      </h2>

      {/* Contract name */}
      <div className="form-control">
        <label className="mb-1 block text-xs text-gray-400">
          Contract name
        </label>
        <input
          type="text"
          className="input input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
          value={form.contractName}
          onChange={handleChange("contractName")}
          placeholder="MyContract"
          required
        />
      </div>

      {/* Source type */}
      <div className="form-control">
        <label className="mb-1 block text-xs text-gray-400">Source type</label>
        <select
          className="select select-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none"
          value={form.sourceType}
          onChange={handleChange("sourceType")}
        >
          <option value="paste">Paste Solidity</option>
          <option value="github">GitHub URL</option>
          <option value="file" disabled>
            Upload file (coming soon)
          </option>
        </select>
      </div>

      {/* Source code (for paste) */}
      {form.sourceType === "paste" && (
        <div className="form-control">
          <label className="mb-1 block text-xs text-gray-400">
            Source code (Solidity)
          </label>
          <textarea
          className="textarea textarea-bordered max-h-72 w-full border-white/10 bg-black/40 text-xs font-mono text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
          rows={8}
            value={form.sourceCode}
            onChange={handleChange("sourceCode")}
            placeholder="contract Vault { function withdraw() external {} }"
          />
        </div>
      )}

      {/* GitHub URL */}
      <div className="form-control">
        <label className="mb-1 block text-xs text-gray-400">
          GitHub URL (optional)
        </label>
        <input
          type="url"
          className="input input-bordered w-full border-white/10 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
          value={form.githubUrl}
          onChange={handleChange("githubUrl")}
          placeholder="https://github.com/example/protocol/blob/main/contracts/Vault.sol"
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {loading?<Loading/>:<button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 sm:w-auto"
        >
          Start Audit
        </button>}
      </div>
    </form>
  );
}

export default NewAuditForm;
