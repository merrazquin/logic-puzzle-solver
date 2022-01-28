#!/usr/bin/env node

const chalk = require('chalk')
const boxen = require('boxen')
const inquirer = require('inquirer')

const UNSOLVED = 0
const SOLVED_NEGATIVE = 1
const SOLVED_POSITIVE = 2

// inquirer.prompt(
//     {
//         type: 'input',
//         name: 'username',
//         message: 'What is your name?'
//     }
// ).then(input => {
//     const greeting = chalk.white.bold(`Hello, ${input.username}!`)

//     const boxenOptions = {
//      padding: 1,
//      margin: 1,
//      borderStyle: 'round',
//      borderColor: 'green',
//      backgroundColor: '#555555'
//     }
//     const msgBox = boxen( greeting, boxenOptions )    
//     console.log(msgBox)
// }) 
const setNegativeSolutionForCategory = (categories, categoryName, optionValue, otherCat, otherOpt) => {
    // fixme
    // categories.filter(category => category.name != categoryName).forEach(category => {
    //     category.options.filter(option => option.value != optionValue).forEach(option => {
    //         console.log(category.name, option.value, otherCat, otherOpt)
    //         option.solutions[otherCat][otherOpt] = SOLVED_NEGATIVE
    //     })
    // })
}

const sweepForSolutions = categories => {
    // this could probably be optimized

    categories.forEach(category => {
        category.options.forEach(option => {
            for (let otherCat in option.solutions) {
                for (let otherOpt in option.solutions[otherCat]) {
                    if (option.solutions[otherCat][otherOpt] === SOLVED_POSITIVE) {
                        console.log('FOUND POSITIVE SOLUTION FOR', category.name, option.value, otherCat, otherOpt)
                        setNegativeSolutionForCategory(categories, category.name, option.value, otherCat, otherOpt)
                    }
                }
            }
        })
    })
}

const processClue = (clue, categories) => {
    /**
     * Types:
     * =:nectars_sourwood,prices_8.5 (The sourwood product costs $8.50)
     * !=:nectar_alfalfa,providers_Nick Norris (Nick Norris did not produce the alfalfa product)
     * ~:prices_8.5,prices_5.5|providers_Nick Norris,nectars_alfalfa (Of the $8.50 honey and the $5.50 product, one is produced by Nick Norris and the other is made from alfalfa nectar.)
     * <:prices:nectar_fireweed,providers_Midge Mintz (The fireweed product costs less than Midge Mintz's product.)
     * <<:prices:1:providers_Linda Lynn,providers_Ivy Ingram (Linda Lynn's product costs 1 dollar less tahn Ivy Ingram's product)
     */
    const infoArr = clue.split(':')
    const type = infoArr.shift()
    let items
    let catName, stepSize
    let itemA, itemB, lowestA, highestA, lowestB, highestB
    switch (type) {
        case '=':
            // this clue should not be processed more than once
            // =:nectars_sourwood,prices_8.5 (The sourwood product costs $8.50)
            items = infoArr.shift().split(',').map(item => {
                let [categoryName, optionValue] = item.split('_')
                const category = categories.find(category => category.name === categoryName)
                const option = category.options.find(option => option.value == optionValue)
                return {category, option}
            })
            for (let i = 0; i < items.length; i++) {
                for (j = 0; j < items.length; j++) {
                    if (i == j) continue

                    const itemA = items[i]
                    const itemB = items[j]

                    itemA.option.addSolution(itemB.category.name, itemB.option.value, SOLVED_POSITIVE)
                    itemA.category.options.forEach(otherOption => {
                        if (otherOption != itemA.option) {
                            otherOption.addSolution(itemB.category.name, itemB.option.value, SOLVED_NEGATIVE)
                        }
                    })
                    itemB.option.addSolution(itemA.category.name, itemA.option.value, SOLVED_POSITIVE)
                    itemB.category.options.forEach(otherOption => {
                        if (otherOption != itemB.option) {
                            otherOption.addSolution(itemA.category.name, itemA.option.value, SOLVED_NEGATIVE)
                        }
                    })
                }
            }
            sweepForSolutions(categories)
            break
        case '!=':
            // !=:nectar_alfalfa,providers_Nick Norris (Nick Norris did not produce the alfalfa product)
            items = infoArr.shift().split(',').map(item => {
                let [categoryName, optionValue] = item.split('_')
                const category = categories.find(category => category.name === categoryName)
                const option = category.options.find(option => option.value == optionValue)
                return {category, option}
            })
            for (let i = 0; i < items.length; i++) {
                for (j = 0; j < items.length; j++) {
                    if (i == j) continue

                    const itemA = items[i]
                    const itemB = items[j]

                    itemA.option.addSolution(itemB.category.name, itemB.option.value, SOLVED_NEGATIVE)
                    itemB.option.addSolution(itemA.category.name, itemA.option.value, SOLVED_NEGATIVE)

                    if (itemA.option.hasNewSolution() || itemB.option.hasNewSolution()) {
                        sweepForSolutions(categories)
                    }
                }
            }
            break
        case '~':
            // ~:prices_8.5,prices_5.5|providers_Nick Norris,nectars_alfalfa (Of the $8.50 honey and the $5.50 product, one is produced by Nick Norris and the other is made from alfalfa nectar.)
            const possibilities = infoArr.shift().split('|').map(items => items.split(',').map(item => {
                let [categoryName, option] = item.split('_')
                const category = categories.find(category => category.name === categoryName)
                if (category.isNumeric()) {
                    option = parseFloat(option)
                }
                return {category, option}
            }))
            console.log(possibilities)
            break
        case '<':
            // <:prices:nectar_fireweed,providers_Midge Mintz (The fireweed product costs less than Midge Mintz's product.)
            catName = infoArr.shift()

            {[itemA, itemB] = infoArr.shift().split(',').map(item => {
                let [categoryName, optionValue] = item.split('_')
                const category = categories.find(category => category.name === categoryName)
                const option = category.options.find(option => option.value == optionValue)
                return {category, option}
            })}

            highestB = itemB.option.getHighestPossibleValue(catName)
            lowestA = itemA.option.getLowestPossibleValue(catName)

            itemA.option.addSolution(catName, highestB, SOLVED_NEGATIVE)
            itemB.option.addSolution(catName, lowestA, SOLVED_NEGATIVE)
            break
        case '<<':
            // <<:prices:1:providers_Linda Lynn,providers_Ivy Ingram (Linda Lynn's product costs 1 dollar less tahn Ivy Ingram's product)
            catName = infoArr.shift()
            stepSize = parseFloat(infoArr.shift())

            {[itemA, itemB] = infoArr.shift().split(',').map(item => {
                let [categoryName, optionValue] = item.split('_')
                const category = categories.find(category => category.name === categoryName)
                const option = category.options.find(option => option.value == optionValue)
                return {category, option}
            })}

            // first, find out if either have a solution
            let itemASolution = itemA.option.getPositiveSolution(catName)
            let itemBSolution = itemB.option.getPositiveSolution(catName)
            if (itemASolution != -1) {
                itemB.option.addSolution(catName, itemASolution + stepSize, SOLVED_POSITIVE)
            } else if (itemBSolution != -1) {
                itemA.option.addSolution(catName, itemBSolution - stepSize, SOLVED_POSITIVE)
            } else {
                // then, find possible solutions and mark impossible ones negative
                let impossibleASolutions = itemA.option.getNegativeSolutions(catName)
                let impossibleBSolutions = itemB.option.getNegativeSolutions(catName)

                impossibleASolutions.forEach(negativeSolution => {
                    itemB.addSolution(catName, negativeSolution + stepSize, SOLVED_NEGATIVE)
                })

                impossibleBSolutions.forEach(negativeSolution => {
                    itemA.addSolution(catName, negativeSolution - stepSize, SOLVED_NEGATIVE)
                })
            }
            
            break
        case '>':
            // >:prices:nectar_fireweed,providers_Midge Mintz (The fireweed product costs more than Midge Mintz's product.)
            catName = infoArr.shift()

            {[itemA, itemB] = infoArr.shift().split(',').map(item => {
                let [categoryName, optionValue] = item.split('_')
                const category = categories.find(category => category.name === categoryName)
                const option = category.options.find(option => option.value == optionValue)
                return {category, option}
            })}

            lowestB = itemB.option.getLowestPossibleValue(catName)
            highestA = itemA.option.getHighestPossibleValue(catName)

            itemA.option.addSolution(catName, lowestB, SOLVED_NEGATIVE)
            itemB.option.addSolution(catName, highestA, SOLVED_NEGATIVE)
            break
        case '>>':
            break            
    }
}

class Option {
    constructor(value) {
        this.value = value
        this.solutions = {}
        this.isDirty = false
    }

    addSolution(categoryName, option, solution) {
        // check if already solved
        if (!this.solutions[categoryName]) {
            this.solutions[categoryName] = {}
        }

        if (solution !== UNSOLVED && this.solutions[categoryName][option] !== UNSOLVED) {
            console.log(`WARNING: Attempting to update solution on ${this.value} for ${categoryName}: ${option} to ${solution} from the already established ${this.solutions[categoryName][option]}`)
            return
        }

        // if (solution !== UNSOLVED && !Object.keys(this.solutions[categoryName]).includes(option)) {
        //     console.log(`WARNING: Not found ${categoryName}: ${option}`)
        //     return
        // }

        // TODO FIXME
        // if (Object.values(this.solutions[categoryName]).includes(SOLVED_POSITIVE)) {
        //     console.log(`ERROR: attempted to override solution for ${categoryName} on ${option} with ${solution}`)
        //     console.log(JSON.stringify(this, 2))
        //     console.log('\n')
        //     // return 
        // }

        this.solutions[categoryName][option] = solution

        if (solution == SOLVED_POSITIVE) {
            for (let otherOpt in this.solutions[categoryName]) {
                if (otherOpt != option) {
                    this.solutions[categoryName][otherOpt] = SOLVED_NEGATIVE
                }
            }
        }

        // check for process of elimination
        const vals = Object.values(this.solutions[categoryName])
        if(vals.filter(val => val === UNSOLVED).length === 1 && vals.filter(val => val === SOLVED_NEGATIVE).length === (vals.length - 1)) {
            for (let opt in this.solutions[categoryName]) {
                if (this.solutions[categoryName][opt] === UNSOLVED) {
                    this.solutions[categoryName][opt] = SOLVED_POSITIVE
                    this.isDirty = true
                }
            }
        }
    }

    hasNewSolution() {
        if (this.isDirty) {
            this.isDirty = false
            return Object.values(this.solutions).filter(obj => Object.values(obj).includes(SOLVED_POSITIVE)).length
        }

        return false
    }

    getHighestPossibleValue(categoryName) {
        let maxVal = -1
        for (let val in this.solutions[categoryName]) {
            if (this.solutions[categoryName][val] !== SOLVED_NEGATIVE) {
                maxVal = Math.max(maxVal, parseFloat(val))
            }
        }
        return maxVal
    }

    getLowestPossibleValue(categoryName) {
        let minVal = 999
        for (let val in this.solutions[categoryName]) {
            if (this.solutions[categoryName][val] !== SOLVED_NEGATIVE) {
                minVal = Math.min(minVal, parseFloat(val))
            }
        }
        return minVal
    }

    getSolutions(categoryName) {
        return this.solutions[categoryName]
    }

    getPositiveSolution(categoryName) {
        for (let val in this.solutions[categoryName]) {
            if (this.solutions[categoryName][val] === SOLVED_POSITIVE) {
                return !isNaN(parseFloat(val)) ? parseFloat(val) : val
            }
        }
        return -1
    }

    getNegativeSolutions(categoryName) {
        let negatives = []
        for (let val in this.solutions[categoryName]) {
            if (this.solutions[categoryName][val] === SOLVED_NEGATIVE) {
                negatives.push(!isNaN(parseFloat(val)) ? parseFloat(val) : val)
            }
        }
        return negatives
    }
}

class Category {
    constructor(name, options) {
        this.name = name
        this.options = options

        if (this.options.every(option => !isNaN(parseFloat(option)))) {
            this.type = 'numeric'
            this.options = this.options.map(option => parseFloat(option))

            if (this.isNumeric()) {
               this.options.sort((a, b) => a - b)
            }
        } else {
            this.type = 'string'
        }

        this.options = this.options.map(option => new Option(option))
    }

    isNumeric() {
        return this.type === 'numeric'
    }
}

const solvePuzzle = (categories, clues) => {
    for (let i = 0; i < categories.length; i++) {
        for (let j = 0; j < categories.length; j++) {
            if (i !== j) {
                categories[j].options.forEach(option => {
                    categories[i].options.forEach(targetOption => {
                        targetOption.addSolution(categories[j].name, option.value, UNSOLVED)
                        option.addSolution(categories[i].name, targetOption.value, UNSOLVED)
                    })
                })
            }
        }
    }
    clues.forEach(clue => {
        processClue(clue, categories)
    })
    console.log(JSON.stringify(categories, null, 4))
}

const collectClues = (clues, numCategories, numOptions, categories) => {
    inquirer.prompt({
        type: 'input',
        name: 'clue'
    }).then(input => {
        if (input.clue.length) {
            clues.push(input.clue)
            collectCategories(numCategories, numOptions, categories)
        } else {
            solvePuzzle(categories, clues)
        }
    })
}

const collectOptionsForCategory = (numCategories, numOptions, categories, options, categoryName) => {
    if (options.length < numOptions) {
        inquirer.prompt(
            {
                type: 'input',
                name: 'option',
                message: `Enter option ${options.length + 1} of ${numOptions} for ${categoryName}`,
                validate: input => !input ? 'Please enter a value' : true
            }
        ).then(input => {
            options.push(input.option)
            collectOptionsForCategory(numCategories, numOptions, categories, options, categoryName)
        })    
    } else {
        categories.push(new Category(categoryName, options))
        collectCategories(numCategories, numOptions, categories)
    }
}

const collectCategories = (numCategories, numOptions, categories) => {
    if (categories.length < numCategories) {
        inquirer.prompt(
            {
                type: 'input',
                name: 'category',
                message: `Enter category ${categories.length + 1} of ${numCategories}`,
                validate: input => !input ? 'Please enter a value' : true
            }
        ).then(input => {
            const categoryName = input.category
            const options = []
            collectOptionsForCategory(numCategories, numOptions, categories, options, categoryName)
        })
    } else {
        collectClues(clues, numCategories, numOptions, categories)
    }
}

const startPuzzle = () => {
    inquirer.prompt(
        {
            type: 'input',
            name: 'dimensions',
            message: 'What are the puzzle dimensions (i.e. 3x4)?',
            validate: input => {
                return ['1x2', '2x2','3x4', '3x5', '4x4', '4x5', '4x6', '4x7'].includes(input) ? true : 'Please enter valid dimensions'
            }
        }
    ).then(input => {
        let [numCategories, numOptions] = input.dimensions.split('x').map(dim => parseInt(dim))
        const categories = []
        collectCategories(numCategories,  numOptions, categories)
    })
}

const clues = []
startPuzzle()

/*
<:y:x_a,x_b
>:y:x_a,x_b


nectars_sourwood,prices_8.5
!=:nectars_alfalfa,providers_nick
<:prices:nectars_fireweed,providers_midge
<<:prices:1:providers_lynn,providers_ivy
*/