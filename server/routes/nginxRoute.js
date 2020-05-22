var app = require('express')
const path = require('path')
var router = app.Router()
var shell = require('shelljs')
var fs = require('fs')
const am = require('../util/asyncMiddleware')
const { User, Customer, CustomerHistory } = require('../object/dbModel')
const nginxConfig = require('../config/nginx_config')

const customer_columns = ['customer_id', 'zone', 'rate', 'burst', 'eda_edge_group', 'external_ip', 'external_port', 'config_file'];

(async () => {
    let config_dir = nginxConfig.nginx.config_dir
    if (!is_dir(config_dir)) {
        console.log(`Creating directory ${config_dir}`)
        output = shell.exec(`sudo mkdir -p ${config_dir}`)
        console.log(output.code)
    }
})();

function is_dir(path) {
    try {
        var stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}

function generateConfigFile(objectMap) {
    try {

        configFileName = `${objectMap.customer_id}.conf`
        localTargetFile = path.join(__dirname, '..', 'generated', configFileName)
        targetFile = path.join(nginxConfig.nginx.config_dir, configFileName)
        templateFile = path.join(__dirname, '..', 'templates', 'nginx.conf.tmpl')
        var temp = fs.readFileSync(templateFile, 'utf-8')
        for (k of Object.keys(objectMap)) {
            temp = temp.replace(`{{${k}}}`, `'${objectMap[k]}'`)
        }
        fs.writeFileSync(localTargetFile, temp, 'utf-8')
        console.log(`File written to ${localTargetFile}`)
        commandOutput = shell.exec(`sudo cp -f ${localTargetFile} ${targetFile}`)
        return {
            code: commandOutput.code,
            stdout: commandOutput.stdout,
            stderr: commandOutput.stderr
        }
    } catch (err) {
        console.log(err.message)
        throw new Error(err.message)
        /* return {
            code: -1,
            stdout: "",
            stderr: err.message
        } */
    }

}

function deleteConfigFile(customerId) {
    try {
        configFileName = `${customerId}.conf`
        localTargetFile = path.join(__dirname, '..', 'generated', configFileName)
        targetFile = path.join(nginxConfig.nginx.config_dir, configFileName)
        commandOutput = shell.exec(`rm -f ${localTargetFile}; sudo rm -f ${targetFile}`)
        if (commandOutput.code == 0) {
            console.log("Config file deleted successfully")
        }
        return {
            code: commandOutput.code,
            stdout: commandOutput.stdout,
            stderr: commandOutput.stderr
        }
    } catch (err) {
        console.log(err.message)
        throw new Error(err.message)
        /* return {
            code: -1,
            stdout: "",
            stderr: err.message
        } */
    }

}

// Get all customers
router.get('/customers', am(async (req, res) => {
    let customers = await Customer.findAll({ attributes: customer_columns }).map(cust => cust.toJSON())
    console.log(customers)
    shell.exec(`echo ${JSON.stringify(customers)} > aaa_custo.txt`)
    return res.status(200).json({
        result: 1,
        message: "Successful",
        data: customers
    })
}))

// Get customer by id
router.get('/customer', am(async (req, res) => {
    const cust_id = req.query['customer_id']
    console.log(`Fetching customer with customer_id: ${cust_id}`)
    let customer = await Customer.findByPk(cust_id, { attributes: customer_columns })
    //console.log(user.dataValues)
    if (!customer) {
        console.log(`No customer found with customer_id: ${cust_id}`)
        return res.status(404).json({
            result: -1,
            message: `No customer found with customer_id: ${cust_id}`,
            data: []
        })
    } else {
        return res.status(200).json({
            result: 1,
            message: `Customer found with customer_id: ${cust_id}`,
            data: customer
        })
    }

}))

// Create Customer
router.post('/customer', am(async (req, res) => {
    const body = req.body
    const cust_id = body['customer_id']
    let customer = await Customer.findByPk(cust_id, { attributes: customer_columns })
    // Create customer if no customer present in database
    if (!customer) {
        try {
            let result = generateConfigFile(body)
            console.log(result)
            // Create customer if the config file creation is successful
            if (result.code == 0) {
                console.log(`Config file created successfully`)

                let record = {
                    customer_id: body.customer_id,
                    zone: body.zone,
                    rate: body.rate,
                    burst: body.burst,
                    eda_edge_group: body.eda_edge_group,
                    external_ip: body.external_ip,
                    external_port: body.external_port,
                    config_file: `${nginxConfig.nginx.config_dir}/${body.customer_id}.conf`
                }
                cust = await Customer.create(record)
                console.log(`New customer created: ${JSON.stringify(cust.dataValues)}`)

                let history_record = {
                    action: "create",
                    config: JSON.stringify(record),
                    username: "dummy",
                    customer_id: cust_id
                }

                await CustomerHistory.create(history_record)
                console.log("customer_history record created")

                return res.status(201).json({
                    result: 1,
                    message: "Customer created Successfully!",
                    data: cust.dataValues
                })
            } else {
                return res.status(400).json({
                    result: -1,
                    message: result.stderr,
                    data: []
                })
            }

        } catch (err) {
            console.log(err)
            return res.status(400).json({
                result: -1,
                message: err.message,
                data: []
            })
        }
    } else {
        return res.status(200).json({
            result: 1,
            message: `Customer already present by customer_id: ${cust_id}`,
            data: customer
        })
    }




}))

// Delete customer
router.delete('/customer', am(async (req, res) => {
    let cust_id = req.query['customer_id']
    if (!cust_id) {
        console.log("Param customer_id not found in the request")
        return res.status(400).json({
            result: -1,
            message: "Param customer_id not found in the request",
            data: []
        })
    } else {
        try {
            result = deleteConfigFile(cust_id)
            if (result.code == 0) {



                /* let history_status = await CustomerHistory.destroy({
                    where: {
                        customer_id: cust_id
                    }
                })
                if(history_status) {
                    console.log("customer_history deleted")
                } else {
                    console.log("No history for the customer")
                } */

                let status = await Customer.destroy({
                    where: {
                        customer_id: cust_id
                    }
                })

                message = status ? `Delete successful for customer_id: ${cust_id}` : `No customer found with customer_id: ${cust_id}`
                console.log(message)

                return res.status(200).json({
                    result: status,
                    message: message,
                    data: []
                })

            }
        } catch (err) {
            console.log(err)
            return res.status(400).json({
                result: -1,
                message: err.message,
                data: []
            })
        }


    }
}))

// Update customer
router.put('/customer', am(async (req, res) => {
    let body = req.body
    let cust_id = body['customer_id']
    if (!cust_id) {
        return res.status(400).json({
            result: -1,
            message: `Param customer_id not found in the request`,
            data: []
        })
    } else {
        result = generateConfigFile(body)
        console.log(result)
        if (result.code == 0) {
            console.log("Config file updated successfully")
            let old_cust = await Customer.findByPk(cust_id)
            // update
            if (old_cust) {
                try {
                    let record = {
                        customer_id: cust_id,
                        zone: body.zone ? body.zone : old_cust.zone,
                        rate: body.rate ? body.rate : old_cust.rate,
                        burst: body.burst ? body.burst : old_cust.burst,
                        eda_edge_group: body.eda_edge_group ? body.eda_edge_group : old_cust.eda_edge_group,
                        external_ip: body.external_ip ? body.external_ip : old_cust.external_ip,
                        external_port: body.external_port ? body.external_port : old_cust.external_port,
                        config_file: old_cust.config_file
                    }

                    let history_record = {
                        action: "update",
                        config: JSON.stringify(record),
                        username: "dummy",
                        customer_id: cust_id
                    }

                    let status = await Customer.update(record, {
                        where: {
                            customer_id: cust_id
                        }
                    })
                    console.log(`Update Status: ${status}`)
                    await CustomerHistory.create(history_record)
                    console.log("customer_history record created")

                    return res.status(200).json({
                        result: 1,
                        message: `Update successful for customer_id: ${cust_id}`,
                        data: []
                    })

                } catch (err) {
                    console.log(err)
                    return res.status(400).json({
                        result: -1,
                        message: err.message,
                        data: []
                    })
                }
            } else {
                // Create a new customer
                let record = {
                    customer_id: body.customer_id,
                    zone: body.zone,
                    rate: body.rate,
                    burst: body.burst,
                    eda_edge_group: body.eda_edge_group,
                    external_ip: body.external_ip,
                    external_port: body.external_port,
                    config_file: `${nginxConfig.nginx.config_dir}/${body.customer_id}.conf`
                }

                let history_record = {
                    action: "create",
                    config: JSON.stringify(record),
                    username: "dummy",
                    customer_id: body.customer_id
                }

                try {
                    let new_cust = await Customer.create(record)
                    console.log(`New customer created: ${JSON.stringify(new_cust.dataValues)}`)

                    await CustomerHistory.create(history_record)
                    console.log("customer_history record created")
                    return res.status(201).json({
                        result: 1,
                        message: "New customer created",
                        data: new_cust.dataValues
                    })
                } catch (err) {
                    console.log(err.message)
                    return res.status(401).json({
                        result: -1,
                        message: err.message,
                        data: []
                    })
                }

            }

        }

    }
}))

module.exports = router