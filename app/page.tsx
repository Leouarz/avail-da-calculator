"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiPromise, disconnect, initialize, TURING_ENDPOINT } from "avail-js-sdk";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { BN } from 'bn.js'
import { formatBalanceToNumber, isNumber } from "@/lib/utils";


export const revalidate = 0;

export default function Home() {
  const selectValues = ["Turing"]

  const [isLoading, setIsLoading] = useState(false)
  const [dataToSend, setDataToSend] = useState("")
  const [selectValue, setSelectValue] = useState(selectValues[0])
  const [error, setError] = useState<string | undefined>(undefined)
  const [storageValues, setStorageValues] = useState<{ maxPerTx: number, maxPerBlock: number } | undefined>(undefined)
  const [result, setResult] = useState<{ cost: number, nbTx: number, nbBatch: number, nbBlocks: number } | undefined>(undefined)
  const [showDetails, setShowDetails] = useState(false)

  function getByteSize(str: string): number {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    return encoded.length;
  }

  const getAvailStorageValues = async (api: ApiPromise) => {
    if (storageValues === undefined) {
      const blockLength = (await api.query.system.dynamicBlockLength()).toHuman() as any
      if (!blockLength) throw new Error("Error getting data, please try again later")
      const maxPerTx = Number(api.consts.dataAvailability.maxAppDataLength.toString())
      const maxPerBlock = Number(blockLength.chunkSize) * Number(blockLength.rows) * Number(blockLength.cols) * 0.9 // We take only 90 percent as to not fill the block
      setStorageValues({ maxPerBlock, maxPerTx })
      return { maxPerBlock, maxPerTx }
    } else {
      return storageValues
    }
  }

  const calculateCost = async () => {
    try {
      setIsLoading(true)
      setError(undefined)
      setResult(undefined)
      setShowDetails(false)

      let costInAvail = undefined
      let nbBatch = 0

      if (dataToSend.length === 0) throw new Error("You need to paste something to calculate the cost.")

      // Initialize the avail sdk api
      const api = await initialize(TURING_ENDPOINT) // Here to change for mainnet

      // Dummy sender
      const sender = "5CDGXH8Q9DzD3TnATTG6qm6f4yR1kbECBGUmh2XbEBQ8Jfa5"

      // Get storage values from the chain
      const { maxPerBlock, maxPerTx } = await getAvailStorageValues(api)

      // Compute the byte size of the given string for computation
      let byteSize = 0
      let data = dataToSend.toLowerCase()
      if (data.includes("kb") && isNumber(data.replace("kb", ''))) {
        let dataSize = Math.ceil(Number(data.replace("kb", '')) * 1024)
        data = "x".repeat(dataSize)
      }
      byteSize = getByteSize(data)

      // Compute information about nb of tx
      const nbTransactions = Math.ceil(byteSize / maxPerTx)

      if (nbTransactions === 1) { // Blob is lower or equal to 512kb
        const cost = await api.tx.dataAvailability.submitData(data).paymentInfo(sender)
        costInAvail = formatBalanceToNumber(cost.partialFee.toString())
      } else { // Blob is greater than 512kb
        // Compute information about batches and minimum nb of blocks needed
        nbBatch = Math.ceil(byteSize / maxPerBlock) // It's the number of batch and also the number of block needed

        // Split the data into chunks
        const chunks = [];
        for (let i = 0; i < nbTransactions; i++) {
          const start = i * maxPerTx;
          const end = start + maxPerTx;
          const chunk = data.slice(start, end);
          chunks.push(chunk);
        }
        // Create the transactions
        const transactions = chunks.map(chunk => api.tx.dataAvailability.submitData(chunk));

        // Split the transactions into batches
        const batches = [];
        const transactionsPerBatch = Math.ceil(maxPerBlock / maxPerTx);
        for (let i = 0; i < nbBatch; i++) {
          const start = i * transactionsPerBatch;
          const end = start + transactionsPerBatch;
          const batch = transactions.slice(start, end);
          batches.push(batch);
        }

        if (batches.length === 1) {
          const cost = await api.tx.utility.batchAll(batches[0]).paymentInfo(sender)
          costInAvail = formatBalanceToNumber(cost.partialFee.toString())
        } else {
          const costRegularBatches = await api.tx.utility.batchAll(batches[0]).paymentInfo(sender)
          const costLastBatch = await api.tx.utility.batchAll(batches[batches.length - 1]).paymentInfo(sender)
          costInAvail = formatBalanceToNumber(costRegularBatches.partialFee.mul(new BN(batches.length - 1)).add(costLastBatch.partialFee).toString())
        }
      }
      setResult({ cost: costInAvail, nbTx: nbTransactions, nbBatch: nbBatch, nbBlocks: nbBatch > 0 ? nbBatch : 1 })
      await disconnect()
    } catch (err: any) {
      console.log(err)
      if (err.message) {
        setError(err.message)
      } else {
        setError(JSON.stringify(err))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const AvailCardHeader = () => {
    return (
      <CardHeader>
        <CardTitle className="text-6xl">Avail DA Calculator</CardTitle>
        <CardDescription className="text-xl">
          Calculate the cost to send transaction to Avail
        </CardDescription>
        <CardDescription className="text-sm">
          {`Paste the data you want to submit to Avail and press "Calculate"`}
        </CardDescription>
      </CardHeader>
    );
  };

  return (
    <main className="flex flex-col min-h-[90vh] max-w-3xl justify-center text-center mx-auto">
      <div>
        <Card className="min-w-full rounded-none md:rounded-2xl h-fit p-1 sm:p-2 md:p-16">
          <AvailCardHeader />
          <CardContent className=" text-left">
            <div className="grid w-full items-center gap-8">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="chain" className="text-lg">
                  Chain
                </Label>
                <Select
                  disabled={isLoading}
                  value={selectValue}
                  onValueChange={(network) =>
                    setSelectValue(
                      selectValues.find((y) => y === network) ||
                      selectValues[0]
                    )
                  }
                >
                  <SelectTrigger id="network">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {selectValues.map((x) => {
                      return (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="dataToSend" className="text-lg">
                  Data you want to submit
                </Label>
                <Textarea
                  id="dataToSend"
                  placeholder="0x... or 128kb"
                  disabled={isLoading}
                  value={dataToSend}
                  onChange={(e) => setDataToSend(e.target.value)}
                  autoFocus
                  maxLength={520000}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col">
            <CardDescription className="text-sm mb-8">
              {`If you prefer to directly use the size of you blob(s), you can put the size in kb with this format "512kb"`}
            </CardDescription>
            <Button
              className="w-full rounded-full"
              onClick={() => calculateCost()}
              disabled={isLoading}
            >
              Calculate
            </Button>

            {result &&
              <>
                <div className="border rounded border-blue-500 p-4 mt-2 w-full">
                  <div className="text-blue-500 text-lg">
                    {`Sending this data will cost ${result.cost} AVAIL`}
                  </div>
                  <div className="underline cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
                    {!showDetails ? `Details` : `Hide details`}
                  </div>
                  {showDetails &&
                    <>
                      <div>
                        {`Your data will be split in ${result.nbTx} blob${result.nbTx > 1 ? "s" : ""} / transaction${result.nbTx > 1 ? "s" : ""}`}
                      </div>
                      {result.nbBatch > 0 && <div>
                        {`The blobs will be grouped in ${result.nbBatch} batch${result.nbBatch > 1 ? "es" : ""}`}
                      </div>}
                      <div>
                        {`The blobs will be sent in ${result.nbBlocks} block${result.nbBlocks > 1 ? "s" : ""}`}
                      </div>
                    </>
                  }
                </div>
              </>
            }


            {error && <div className="text-red-500 mt-2">{error}</div>}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
